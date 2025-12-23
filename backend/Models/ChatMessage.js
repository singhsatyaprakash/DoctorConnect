const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    senderType: { type: String, enum: ['doctor', 'patient', 'admin'], default: 'doctor' },
    text: { type: String, default: '' },

    // client-generated id from frontend (optional)
    clientMessageId: { type: String, index: true },

    meta: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
