const mongoose = require('mongoose');

const CallScheduleSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    doctorId: { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },

    scheduledFor: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'ended', 'cancelled'],
      default: 'scheduled',
      index: true,
    },

    startedAt: { type: Date },
    endedAt: { type: Date },

    createdByUserId: { type: String },
    lastUpdatedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CallSchedule', CallScheduleSchema);
