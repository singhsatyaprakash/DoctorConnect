const express = require('express');
const CallSchedule = require('../Models/CallSchedule');

const router = express.Router();

const PROTO_DOCTOR_ID = 'doctor@gmail.com';
const PROTO_PATIENT_ID = 'patient@gmail.com';
const PROTO_CALL_ROOM_ID = `call_${PROTO_DOCTOR_ID}_${PROTO_PATIENT_ID}`;

// POST /api/calls/schedule
// body: { roomId, doctorId, patientId, scheduledFor }
router.post('/schedule', async (req, res) => {
  try {
    const { roomId, doctorId, patientId, scheduledFor } = req.body || {};
    if (!roomId || !doctorId || !patientId || !scheduledFor) {
      return res.status(400).json({ message: 'roomId, doctorId, patientId, scheduledFor required' });
    }

    if (doctorId !== PROTO_DOCTOR_ID || patientId !== PROTO_PATIENT_ID || roomId !== PROTO_CALL_ROOM_ID) {
      return res.status(403).json({ message: 'Prototype mode: invalid doctor/patient/room' });
    }

    const dt = new Date(scheduledFor);
    if (Number.isNaN(dt.getTime())) return res.status(400).json({ message: 'scheduledFor must be a valid date' });

    const doc = await CallSchedule.create({
      roomId,
      doctorId,
      patientId,
      scheduledFor: dt,
      status: 'scheduled',
      createdAt: new Date(),
    });

    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/calls/cancel
// body: { id }
router.post('/cancel', async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ message: 'id required' });

    const updated = await CallSchedule.findByIdAndUpdate(
      id,
      { status: 'cancelled', lastUpdatedAt: new Date() },
      { new: true }
    );

    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/calls/schedule
router.get('/schedule', async (req, res) => {
  try {
    const { roomId, doctorId, patientId } = req.query || {};

    // ✅ only allow viewing prototype call schedule
    const ok =
      (roomId && roomId === PROTO_CALL_ROOM_ID) ||
      (doctorId && doctorId === PROTO_DOCTOR_ID) ||
      (patientId && patientId === PROTO_PATIENT_ID);

    if (!ok) return res.status(403).json({ message: 'Prototype mode: access denied' });

    const q = { roomId: PROTO_CALL_ROOM_ID, doctorId: PROTO_DOCTOR_ID, patientId: PROTO_PATIENT_ID };
    const items = await CallSchedule.find(q).sort({ scheduledFor: 1 }).limit(200).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
