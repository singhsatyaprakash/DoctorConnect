const express = require('express');
const ChatRoom = require('../Models/ChatRoom');
const ChatMessage = require('../Models/ChatMessage');

const router = express.Router();

const PROTO_DOCTOR_ID = 'doctor@gmail.com';
const PROTO_PATIENT_ID = 'patient@gmail.com';
const PROTO_ROOM_ID = `chat_${PROTO_DOCTOR_ID}_${PROTO_PATIENT_ID}`;

// POST /api/chat/room
// body: { doctorId, patientId } -> returns { roomId }
router.post('/room', async (req, res) => {
  try {
    const { doctorId, patientId } = req.body || {};
    if (!doctorId || !patientId) return res.status(400).json({ message: 'doctorId and patientId required' });

    if (doctorId !== PROTO_DOCTOR_ID || patientId !== PROTO_PATIENT_ID) {
      return res.status(403).json({ message: 'Prototype mode: only doctor@gmail.com and patient@gmail.com allowed' });
    }

    const roomId = PROTO_ROOM_ID;

    await ChatRoom.findOneAndUpdate(
      { roomId },
      { roomId, doctorId, patientId, lastActiveAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ roomId });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/chat/:roomId/messages?limit=50&before=<iso>
router.get('/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    if (roomId !== PROTO_ROOM_ID) {
      return res.status(403).json({ message: 'Prototype mode: invalid room' });
    }

    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
    const before = req.query.before ? new Date(req.query.before) : null;

    const q = { roomId };
    if (before) q.createdAt = { $lt: before };

    const messages = await ChatMessage.find(q).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ roomId, messages: messages.reverse() });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
