// Active connections storage
const activeConnections = new Map(); // Map<socketId, userData>
const userRooms = new Map(); // Map<userId, Set<roomId>>
const onlineUsers = new Set(); // Set<userId>
const typingUsers = new Map(); // Map<roomId, Set<userId>>
const pendingDisconnects = new Map(); // Map<userId, TimeoutId>

// Mongo models (prototype persistence)
const ChatRoom = require('../Models/ChatRoom');
const ChatMessage = require('../Models/ChatMessage');
const CallSchedule = require('../Models/CallSchedule');

// ✅ Prototype allowlist (ONLY these two users can use realtime chat/calls)
const PROTO_DOCTOR_ID = 'doctor@gmail.com';
const PROTO_PATIENT_ID = 'patient@gmail.com';

module.exports = (io) => {
  console.log('Socket.IO service initialized');

  // Authentication middleware
  io.use((socket, next) => {
    const userId = socket.handshake.query.userId;
    const userType = socket.handshake.query.userType;

    if (!userId || !userType) {
      return next(new Error('Authentication error: Missing userId or userType'));
    }

    // ✅ hard restrict to prototype users only
    const allowed =
      (userId === PROTO_DOCTOR_ID && userType === 'doctor') ||
      (userId === PROTO_PATIENT_ID && userType === 'patient');

    if (!allowed) {
      return next(new Error('Prototype mode: only doctor@gmail.com and patient@gmail.com are allowed'));
    }

    // Store user info in socket
    socket.userId = userId;
    socket.userType = userType;
    try {
      socket.userData = socket.handshake.query.userData
        ? JSON.parse(socket.handshake.query.userData)
        : {};
    } catch {
      socket.userData = {};
    }

    next();
  });

  io.on('connection', (socket) => {
    const { userId, userType, userData } = socket;

    // If there was a pending disconnect for this user, cancel it (user reconnected)
    if (pendingDisconnects.has(userId)) {
      clearTimeout(pendingDisconnects.get(userId));
      pendingDisconnects.delete(userId);
      console.log(`⏱️ Cleared pending disconnect for ${userId} (reconnected)`);
    }
    
    console.log(`🔗 New connection: ${userId} (${userType}) - Socket ID: ${socket.id}`);
    
    // Store connection
    activeConnections.set(socket.id, {
      userId,
      userType,
      socketId: socket.id,
      connectedAt: new Date().toISOString(),
      ...userData
    });
    
    // Add to online users
    onlineUsers.add(userId);
    
    // Notify user about their successful connection
    socket.emit('connection-established', {
      message: 'Connected to MediCare Socket.IO server',
      socketId: socket.id,
      userId,
      userType,
      timestamp: new Date().toISOString()
    });
    
    // Notify others about user going online
    socket.broadcast.emit('user-online', {
      userId,
      userType,
      timestamp: new Date().toISOString()
    });

    // =================== CHAT FUNCTIONALITY ===================
    
    // Join chat room
    socket.on('join-chat-room', async ({ roomId, timestamp } = {}) => {
      try {
        if (!roomId) throw new Error('Missing roomId');

        socket.join(roomId);

        // Track user's rooms (use authenticated socket userId)
        if (!userRooms.has(userId)) userRooms.set(userId, new Set());
        userRooms.get(userId).add(roomId);

        console.log(`💬 ${userId} (${userType}) joined chat room: ${roomId}`);

        socket.to(roomId).emit('user-joined-chat', {
          roomId,
          userId,
          userType,
          timestamp: timestamp || new Date().toISOString()
        });
        
        // Send room info to the user
        const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
        socket.emit('room-joined', {
          roomId,
          participants: roomSize,
          timestamp: new Date().toISOString()
        });
        
        // + Upsert room record (best-effort)
        //   Prototype convention supported: "chat_<doctorId>_<patientId>"
        try {
          const parts = String(roomId || '').split('_');
          const isProto = parts[0] === 'chat' && parts.length >= 3;
          const doctorId = isProto ? parts[1] : undefined;
          const patientId = isProto ? parts[2] : undefined;

          await ChatRoom.findOneAndUpdate(
            { roomId },
            {
              roomId,
              doctorId,
              patientId,
              lastActiveAt: new Date(),
            },
            { upsert: true, new: true }
          );
        } catch (e) {
          console.warn('ChatRoom upsert failed (non-fatal):', e?.message || e);
        }
      } catch (error) {
        console.error('Error joining chat room:', error);
        socket.emit('error', {
          type: 'JOIN_CHAT_ERROR',
          message: error.message
        });
      }
    });

    // Leave chat room
    socket.on('leave-chat-room', ({ roomId, timestamp }) => {
      try {
        socket.leave(roomId);
        
        // Remove from tracking
        if (userRooms.has(userId)) {
          userRooms.get(userId).delete(roomId);
        }
        
        socket.to(roomId).emit('user-left-chat', {
          roomId,
          userId,
          timestamp: timestamp || new Date().toISOString()
        });
        
        console.log(`🚪 ${userId} left chat room: ${roomId}`);
      } catch (error) {
        console.error('Error leaving chat room:', error);
      }
    });

    // Send message
    socket.on('send-message', async ({ roomId, message }) => {
      try {
        if (!message || !roomId) throw new Error('Missing roomId or message');

        // ✅ prevent client spoofing sender
        const messageData = {
          ...message,
          senderId: userId,
          senderType: userType,
          timestamp: new Date().toISOString(),
          delivered: true
        };
        
        // + Persist message (best-effort)
        let persisted = null;
        try {
          persisted = await ChatMessage.create({
            roomId,
            senderId: messageData.senderId || userId,
            senderType: messageData.senderType || userType,
            text: messageData.text || '',
            clientMessageId: messageData.id,
            meta: {
              fromSocketId: socket.id,
            },
            createdAt: new Date(),
          });

          // attach server id for clients that care
          messageData.serverMessageId = String(persisted._id);
        } catch (e) {
          console.warn('ChatMessage persist failed (non-fatal):', e?.message || e);
        }

        // Broadcast to room (including sender for consistency)
        io.to(roomId).emit('receive-message', {
          roomId,
          message: messageData,
          from: userId
        });
        
        console.log(`📨 Message in ${roomId} from ${userId}: ${messageData.text?.substring(0, 50)}...`);
        
        // Mark as read by sender
        socket.emit('message-sent', {
          messageId: messageData.id,
          timestamp: messageData.timestamp
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', {
          type: 'SEND_MESSAGE_ERROR',
          message: error.message
        });
      }
    });

    // Typing indicator
    socket.on('typing', ({ roomId, isTyping } = {}) => {
      try {
        const typingUserId = userId;
        if (!roomId) return;

        if (isTyping) {
          if (!typingUsers.has(roomId)) typingUsers.set(roomId, new Set());
          typingUsers.get(roomId).add(typingUserId);
        } else {
          if (typingUsers.has(roomId)) {
            typingUsers.get(roomId).delete(typingUserId);
            if (typingUsers.get(roomId).size === 0) typingUsers.delete(roomId);
          }
        }

        socket.to(roomId).emit('typing', {
          roomId,
          userId: typingUserId,
          isTyping: !!isTyping,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error handling typing indicator:', error);
      }
    });

    // Mark message as read
    socket.on('mark-read', ({ roomId, messageId }) => {
      try {
        socket.to(roomId).emit('message-read', {
          roomId,
          messageId,
          readBy: userId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // =================== VIDEO CALL FUNCTIONALITY ===================
    
    // Join video room
    socket.on('join-video-room', ({ roomId, timestamp } = {}) => {
      try {
        if (!roomId) throw new Error('Missing roomId');

        const joinUserId = userId;
        const joinUserType = userType;

        socket.join(`video-${roomId}`);
        
        console.log(`🎥 ${userId} joined video room: ${roomId}`);
        
        // Get list of participants already in the room
        const videoRoom = `video-${roomId}`;
        const participants = Array.from(io.sockets.adapter.rooms.get(videoRoom) || [])
          .filter(socketId => socketId !== socket.id);
        
        // Notify existing participants about new user
        socket.to(videoRoom).emit('user-joined-video', {
          roomId,
          userId: joinUserId,
          userType: joinUserType,
          userData,
          socketId: socket.id,
          timestamp: timestamp || new Date().toISOString()
        });
        
        // Send existing participants to the new user
        socket.emit('video-room-participants', {
          roomId,
          participants: participants.map(socketId => ({
            socketId,
            ...(activeConnections.get(socketId) || {})
          })),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error joining video room:', error);
        socket.emit('error', {
          type: 'JOIN_VIDEO_ERROR',
          message: error.message
        });
      }
    });

    // Leave video room
    socket.on('leave-video-room', ({ roomId, userId, timestamp }) => {
      try {
        socket.leave(`video-${roomId}`);
        
        socket.to(`video-${roomId}`).emit('user-left-video', {
          roomId,
          userId,
          socketId: socket.id,
          timestamp: timestamp || new Date().toISOString()
        });
        
        console.log(`🎥 ${userId} left video room: ${roomId}`);
      } catch (error) {
        console.error('Error leaving video room:', error);
      }
    });

    // WebRTC signaling - Offer
    socket.on('offer', ({ roomId, offer, targetSocketId }) => {
      try {
        socket.to(targetSocketId).emit('offer', {
          roomId,
          offer,
          fromSocketId: socket.id,
          fromUserId: userId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error sending offer:', error);
      }
    });

    // WebRTC signaling - Answer
    socket.on('answer', ({ roomId, answer, targetSocketId }) => {
      try {
        socket.to(targetSocketId).emit('answer', {
          roomId,
          answer,
          fromSocketId: socket.id,
          fromUserId: userId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error sending answer:', error);
      }
    });

    // WebRTC signaling - ICE Candidate
    socket.on('ice-candidate', ({ roomId, candidate, targetSocketId }) => {
      try {
        socket.to(targetSocketId).emit('ice-candidate', {
          roomId,
          candidate,
          fromSocketId: socket.id,
          fromUserId: userId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error sending ICE candidate:', error);
      }
    });

    // + Schedule a call (prototype)
    // payload: { roomId, doctorId, patientId, scheduledFor }
    socket.on('schedule-call', async ({ roomId, doctorId, patientId, scheduledFor }) => {
      try {
        // ✅ only allow doctor<->patient schedule
        if (
          doctorId !== PROTO_DOCTOR_ID ||
          patientId !== PROTO_PATIENT_ID ||
          roomId !== `call_${PROTO_DOCTOR_ID}_${PROTO_PATIENT_ID}`
        ) {
          throw new Error('Prototype mode: invalid doctor/patient/room');
        }
        if (!scheduledFor) throw new Error('Missing scheduledFor');

        const schedule = await CallSchedule.create({
          roomId,
          doctorId,
          patientId,
          scheduledFor: new Date(scheduledFor),
          status: 'scheduled',
          createdByUserId: userId,
          createdAt: new Date(),
        });

        // notify both users (socket + notifications room if used)
        io.to(`notifications-${doctorId}`).emit('call-scheduled', schedule);
        io.to(`notifications-${patientId}`).emit('call-scheduled', schedule);
        socket.emit('call-scheduled', schedule);
      } catch (error) {
        console.error('Error scheduling call:', error);
        socket.emit('error', { type: 'SCHEDULE_CALL_ERROR', message: error.message });
      }
    });

    // Call control - Start call
    socket.on('call-start', async ({ roomId, timestamp }) => {
      try {
        // ✅ ignore callerId/patientId from client; compute the other party
        const callerId = userId;
        const otherUserId = callerId === PROTO_DOCTOR_ID ? PROTO_PATIENT_ID : PROTO_DOCTOR_ID;

        const targetSocket = Array.from(activeConnections.entries())
          .find(([_, data]) => data.userId === otherUserId)?.[0];

        if (targetSocket) {
          io.to(targetSocket).emit('incoming-call', {
            roomId,
            callerId,
            callerData: userData,
            timestamp: timestamp || new Date().toISOString()
          });
        }

        // ✅ update schedule only for prototype room
        try {
          await CallSchedule.findOneAndUpdate(
            { roomId, doctorId: PROTO_DOCTOR_ID, patientId: PROTO_PATIENT_ID, status: { $in: ['scheduled'] } },
            { status: 'in_progress', startedAt: new Date(), lastUpdatedAt: new Date() },
            { new: true }
          );
        } catch (e) {
          console.warn('CallSchedule start update failed (non-fatal):', e?.message || e);
        }
      } catch (error) {
        console.error('Error starting call:', error);
      }
    });

    // Call control - End call
    socket.on('call-end', async ({ roomId, userId, timestamp }) => {
      try {
        io.to(`video-${roomId}`).emit('call-ended', {
          roomId,
          endedBy: userId,
          timestamp: timestamp || new Date().toISOString()
        });

        // + Best-effort: mark any in-progress schedule for this room as ended
        try {
          await CallSchedule.updateMany(
            { roomId, status: 'in_progress' },
            { status: 'ended', endedAt: new Date(), lastUpdatedAt: new Date() }
          );
        } catch (e) {
          console.warn('CallSchedule end update failed (non-fatal):', e?.message || e);
        }
      } catch (error) {
        console.error('Error ending call:', error);
      }
    });

    // =================== NOTIFICATIONS ===================
    
    // Subscribe to notifications
    socket.on('subscribe-notifications', ({ userId, timestamp }) => {
      try {
        socket.join(`notifications-${userId}`);
        console.log(`🔔 ${userId} subscribed to notifications`);
      } catch (error) {
        console.error('Error subscribing to notifications:', error);
      }
    });

    // Send notification (admin/doctor can use this)
    socket.on('send-notification', ({ targetUserId, title, message, type }) => {
      try {
        io.to(`notifications-${targetUserId}`).emit('notification', {
          title,
          message,
          type: type || 'info', // info, success, warning, error
          timestamp: new Date().toISOString(),
          read: false
        });
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    });

    // =================== PRESENCE ===================
    
    // Set online status
    socket.on('presence', ({ userId, status, timestamp }) => {
      try {
        if (status === 'online') {
          onlineUsers.add(userId);
        } else if (status === 'offline') {
          onlineUsers.delete(userId);
        }
        
        socket.broadcast.emit('presence-update', {
          userId,
          status,
          timestamp: timestamp || new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    });

    // Get online users
    socket.on('get-online-users', () => {
      try {
        socket.emit('online-users', {
          users: Array.from(onlineUsers),
          count: onlineUsers.size,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error getting online users:', error);
      }
    });

    // =================== DISCONNECTION ===================
    
    socket.on('disconnect', (reason) => {
      console.log(`❌ Disconnected socket: ${socket.id} for ${userId} (${userType}) - Reason: ${reason}`);
      
      // Remove this socket's active connection immediately
      activeConnections.delete(socket.id);
      
      // If user still has other active sockets, do not mark offline
      const stillConnected = Array.from(activeConnections.values())
        .some(data => data.userId === userId);
      
      if (stillConnected) {
        console.log(`ℹ️ User ${userId} still has active sockets, not marking offline.`);
        // Optionally: remove this socket from rooms if needed (socket leaves automatically)
        return;
      }
      
      // Start a grace period before marking user fully offline (allow reconnection)
      const GRACE_MS = 2 * 60 * 1000; // 2 minutes (match connectionStateRecovery)
      const timeoutId = setTimeout(() => {
        try {
          // Final cleanup since user did not reconnect within grace period
          onlineUsers.delete(userId);
          
          // Leave all rooms and notify others
          if (userRooms.has(userId)) {
            userRooms.get(userId).forEach(roomId => {
              socket.to(roomId).emit('user-left-chat', {
                roomId,
                userId,
                timestamp: new Date().toISOString(),
                reason: 'disconnected'
              });
            });
            userRooms.delete(userId);
          }
          
          // Notify others about user going offline
          socket.broadcast.emit('user-offline', {
            userId,
            timestamp: new Date().toISOString(),
            reason
          });
          
          // Clean up typing indicators
          for (const [roomId, users] of typingUsers.entries()) {
            if (users.has(userId)) {
              users.delete(userId);
              if (users.size === 0) {
                typingUsers.delete(roomId);
              }
            }
          }
          
          pendingDisconnects.delete(userId);
          console.log(`🛑 User ${userId} marked offline after grace period`);
        } catch (error) {
          console.error('Error during pending-disconnect cleanup:', error);
        }
      }, GRACE_MS);
      
      pendingDisconnects.set(userId, timeoutId);
      console.log(`⏳ Started grace period (${GRACE_MS}ms) for ${userId} before marking offline`);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error for ${userId}:`, error);
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });
  });

  // Periodic cleanup
  setInterval(() => {
    console.log(`📊 Stats: ${activeConnections.size} active connections, ${onlineUsers.size} online users`);
  }, 60000); // Log every minute
};