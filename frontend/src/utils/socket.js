import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.isConnecting = false;
    this.reconnectTimeout = null;
    this.eventListeners = new Map();
  }

  connect(userId, userType = 'doctor', userData = {}, token = null) {
    if (this.isConnecting || this.socket?.connected) {
      console.log('Socket already connecting or connected');
      return this.socket;
    }

    this.isConnecting = true;
    this.connectionAttempts++;

    console.log(`🔗 Connecting to Socket.IO server (attempt ${this.connectionAttempts})...`);

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: this.maxConnectionAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      query: {
        userId,
        userType,
        userData: JSON.stringify(userData)
      },
      auth: token ? { token } : {},
      forceNew: true,
      upgrade: true,
      rememberUpgrade: true
    });

    // attach useful meta so other methods can read them (presence / reconnect)
    this.socket.userId = userId;
    this.socket.userType = userType;
    this.socket.userData = userData;
    if (token) this.socket.token = token;

    // Setup event listeners
    this.setupEventListeners(userId);

    return this.socket;
  }

  setupEventListeners(userId) {
    if (!this.socket) return;

    // Remove previous listeners if any
    this.removeAllListeners();

    // Connection established
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected successfully:', this.socket.id);
      this.connectionAttempts = 0;
      this.isConnecting = false;
      
      // Subscribe to notifications
      this.subscribeToNotifications(userId);
      
      // Set online status
      this.setOnlineStatus(userId, 'online');
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      this.isConnecting = false;
      
      // Exponential backoff for reconnection
      const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
      
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log(`⏳ Retrying connection in ${delay}ms...`);
        this.reconnectTimeout = setTimeout(() => {
          this.reconnect();
        }, delay);
      }
    });

    // Connection established confirmation
    this.socket.on('connection-established', (data) => {
      console.log('🔌 Connection established:', data);
    });

    // Disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('🔴 Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.reconnect();
      }
    });

    // Ping/Pong for connection health
    this.socket.on('pong', (data) => {
      console.debug('🏓 Pong received:', data);
    });
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.socket) {
      // Set offline status before disconnecting
      if (this.socket.userId) {
        this.setOnlineStatus(this.socket.userId, 'offline');
      }
      
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connectionAttempts = 0;
    this.isConnecting = false;
    this.removeAllListeners();
    
    console.log('🔌 Socket disconnected');
  }

  reconnect() {
    if (this.socket && this.socket.userId) {
      const { userId, userType, userData } = this.socket;
      this.disconnect();
      setTimeout(() => {
        this.connect(userId, userType, userData);
      }, 1000);
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // =================== CHAT METHODS ===================
  
  joinChatRoom(roomId, userId, userType = 'doctor') {
    if (this.socket?.connected) {
      this.socket.emit('join-chat-room', {
        roomId,
        userId,
        userType,
        timestamp: new Date().toISOString()
      });
      console.log(`💬 Joining chat room: ${roomId}`);
    } else {
      console.warn('Socket not connected, cannot join chat room');
    }
  }

  leaveChatRoom(roomId) {
    if (this.socket?.connected) {
      this.socket.emit('leave-chat-room', {
        roomId,
        timestamp: new Date().toISOString()
      });
    }
  }

  sendMessage(roomId, message, senderId, senderType = 'doctor') {
    if (this.socket?.connected) {
      const messageData = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        text: message,
        senderId,
        senderType,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };
      
      this.socket.emit('send-message', {
        roomId,
        message: messageData
      });
      
      return messageData;
    }
    return null;
  }

  onReceiveMessage(callback) {
    if (this.socket) {
      this.socket.on('receive-message', callback);
    }
  }

  onTyping(callback) {
    if (this.socket) {
      this.socket.on('typing', callback);
    }
  }

  sendTyping(roomId, userId, isTyping) {
    if (this.socket?.connected) {
      this.socket.emit('typing', {
        roomId,
        userId,
        isTyping
      });
    }
  }

  markMessageAsRead(roomId, messageId) {
    if (this.socket?.connected) {
      this.socket.emit('mark-read', {
        roomId,
        messageId
      });
    }
  }

  onMessageRead(callback) {
    if (this.socket) {
      this.socket.on('message-read', callback);
    }
  }

  // =================== VIDEO CALL METHODS ===================
  
  joinVideoRoom(roomId, userId, userType = 'doctor', userData = {}) {
    if (this.socket?.connected) {
      this.socket.emit('join-video-room', {
        roomId,
        userId,
        userType,
        userData,
        timestamp: new Date().toISOString()
      });
      console.log(`🎥 Joining video room: ${roomId}`);
    }
  }

  leaveVideoRoom(roomId, userId) {
    if (this.socket?.connected) {
      this.socket.emit('leave-video-room', {
        roomId,
        userId,
        timestamp: new Date().toISOString()
      });
    }
  }

  // WebRTC signaling methods
  sendOffer(roomId, offer, targetSocketId) {
    if (this.socket?.connected) {
      this.socket.emit('offer', {
        roomId,
        offer,
        targetSocketId
      });
    }
  }

  sendAnswer(roomId, answer, targetSocketId) {
    if (this.socket?.connected) {
      this.socket.emit('answer', {
        roomId,
        answer,
        targetSocketId
      });
    }
  }

  sendIceCandidate(roomId, candidate, targetSocketId) {
    if (this.socket?.connected) {
      this.socket.emit('ice-candidate', {
        roomId,
        candidate,
        targetSocketId
      });
    }
  }

  onOffer(callback) {
    if (this.socket) {
      this.socket.on('offer', callback);
    }
  }

  onAnswer(callback) {
    if (this.socket) {
      this.socket.on('answer', callback);
    }
  }

  onIceCandidate(callback) {
    if (this.socket) {
      this.socket.on('ice-candidate', callback);
    }
  }

  // Call control
  startCall(roomId, callerId, patientId) {
    if (this.socket?.connected) {
      this.socket.emit('call-start', {
        roomId,
        callerId,
        patientId,
        timestamp: new Date().toISOString()
      });
    }
  }

  endCall(roomId, userId) {
    if (this.socket?.connected) {
      this.socket.emit('call-end', {
        roomId,
        userId,
        timestamp: new Date().toISOString()
      });
    }
  }

  toggleAudioVideo(roomId, userId, type, enabled) {
    if (this.socket?.connected) {
      this.socket.emit('call-toggle', {
        roomId,
        userId,
        type,
        enabled,
        timestamp: new Date().toISOString()
      });
    }
  }

  onIncomingCall(callback) {
    if (this.socket) {
      this.socket.on('incoming-call', callback);
    }
  }

  onCallEnded(callback) {
    if (this.socket) {
      this.socket.on('call-ended', callback);
    }
  }

  onCallToggled(callback) {
    if (this.socket) {
      this.socket.on('call-toggled', callback);
    }
  }

  onUserJoinedVideo(callback) {
    if (this.socket) {
      this.socket.on('user-joined-video', callback);
    }
  }

  onUserLeftVideo(callback) {
    if (this.socket) {
      this.socket.on('user-left-video', callback);
    }
  }

  onVideoRoomParticipants(callback) {
    if (this.socket) {
      this.socket.on('video-room-participants', callback);
    }
  }

  // =================== NOTIFICATION METHODS ===================
  
  subscribeToNotifications(userId) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe-notifications', {
        userId,
        timestamp: new Date().toISOString()
      });
    }
  }

  onNotification(callback) {
    if (this.socket) {
      this.socket.on('notification', callback);
    }
  }

  sendNotification(targetUserId, title, message, type = 'info') {
    if (this.socket?.connected) {
      this.socket.emit('send-notification', {
        targetUserId,
        title,
        message,
        type
      });
    }
  }

  // =================== PRESENCE METHODS ===================
  
  setOnlineStatus(userId, status = 'online') {
    if (this.socket?.connected) {
      this.socket.emit('presence', {
        userId,
        status,
        timestamp: new Date().toISOString()
      });
    }
  }

  onPresenceUpdate(callback) {
    if (this.socket) {
      this.socket.on('presence-update', callback);
    }
  }

  getOnlineUsers() {
    if (this.socket?.connected) {
      this.socket.emit('get-online-users');
    }
  }

  onOnlineUsers(callback) {
    if (this.socket) {
      this.socket.on('online-users', callback);
    }
  }

  onUserOnline(callback) {
    if (this.socket) {
      this.socket.on('user-online', callback);
    }
  }

  onUserOffline(callback) {
    if (this.socket) {
      this.socket.on('user-offline', callback);
    }
  }

  // =================== UTILITY METHODS ===================
  
  ping() {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  onPong(callback) {
    if (this.socket) {
      this.socket.on('pong', callback);
    }
  }

  onError(callback) {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  onRoomJoined(callback) {
    if (this.socket) {
      this.socket.on('room-joined', callback);
    }
  }

  onUserJoinedChat(callback) {
    if (this.socket) {
      this.socket.on('user-joined-chat', callback);
    }
  }

  onUserLeftChat(callback) {
    if (this.socket) {
      this.socket.on('user-left-chat', callback);
    }
  }

  onMessageSent(callback) {
    if (this.socket) {
      this.socket.on('message-sent', callback);
    }
  }
}

const socketService = new SocketService();
export default socketService;