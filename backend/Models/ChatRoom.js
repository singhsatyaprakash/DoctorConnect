const mongoose = require('mongoose');

const ChatRoomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    doctorId: { type: String, index: true },
    patientId: { type: String, index: true },
    lastActiveAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatRoom', ChatRoomSchema);
