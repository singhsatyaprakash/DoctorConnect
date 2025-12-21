const Doctor = require("../Models/doctor.model");
const Appointment = require("../Models/appointment.model");
const BookingHistoryDoctor = require("../Models/bookingHistoryDoctorModel");

// search doctors with optional filters: specialization, minFee, maxFee, verified
exports.searchDoctors = async (req, res) => {
  try {
    const { specialization, minFee, maxFee, verified } = req.query;
    // console.log(req.query);
    const filter = {};

    if (specialization) filter.specialization = new RegExp(`^${specialization}$`, "i");
    if (verified === "true") filter.isVerified = true;
    if (verified === "false") filter.isVerified = false;

    // start with basic query
    let doctors = await Doctor.find(filter).lean();

    // apply fee filtering client-side because fees are per-type; if min/max provided, keep doctors with any matching fee
    if (minFee || maxFee) {
      const min = Number(minFee) || 0;
      const max = Number(maxFee) || Number.MAX_SAFE_INTEGER;
      doctors = doctors.filter((d) => {
        const fees = [d.consultationFee?.chat, d.consultationFee?.voice, d.consultationFee?.video].map(f => Number(f || 0));
        return fees.some(f => f >= min && f <= max);
      });
    }

    // return public-safe doctor objects
    const safe = doctors.map(d => {
      delete d.password;
      delete d.token;
      delete d.__v;
      return d;
    });
    // console.log(safe);

    return res.json({ success: true, data: safe });
  } catch (err) {
    console.error("searchDoctors error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET single doctor by id (safe)
exports.getDoctor = async (req, res) => {
  try {
    const id = req.params.id;
    const doctor = await Doctor.findById(id).lean();
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    // remove sensitive fields
    delete doctor.password;
    delete doctor.token;
    delete doctor.__v;
    return res.json({ success: true, data: doctor });
  } catch (err) {
    console.error("getDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// book an appointment (enhanced)
exports.bookAppointment = async (req, res) => {
  try {
    const { patient, doctorId, type, scheduledAt, slotId, notes } = req.body;

    if (!patient || !doctorId || !type || !slotId) {
      return res.status(400).json({
        success: false,
        message: 'patient, doctorId, type and slotId are required'
      });
    }

    // Atomically reserve the slot (prevents double-booking)
    const reservedDoctor = await Doctor.findOneAndUpdate(
      {
        _id: doctorId,
        'slots._id': slotId,
        'slots.isBooked': false,
        'slots.type': type
      },
      { $set: { 'slots.$.isBooked': true } },
      { new: true }
    );

    if (!reservedDoctor) {
      const exists = await Doctor.exists({ _id: doctorId });
      if (!exists) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }
      return res.status(409).json({
        success: false,
        message: 'Slot is not available (already booked or invalid for this type)'
      });
    }

    const slot = reservedDoctor.slots?.id(slotId);
    if (!slot) {
      // extremely unlikely because we matched it, but be defensive
      return res.status(409).json({ success: false, message: 'Slot not available' });
    }

    // derive scheduledAt from slot date + time (ignore client value for safety)
    const derivedScheduledAt = new Date(slot.date);
    const [hhRaw, mmRaw] = String(slot.time).split(':');
    const hh = Number(hhRaw);
    const mm = Number(mmRaw);
    if (!Number.isNaN(hh)) derivedScheduledAt.setHours(hh, Number.isNaN(mm) ? 0 : mm, 0, 0);

    // reject booking into the past (by derived scheduled time)
    if (derivedScheduledAt.getTime() < Date.now()) {
      await Doctor.updateOne(
        { _id: doctorId, 'slots._id': slotId },
        { $set: { 'slots.$.isBooked': false } }
      );
      return res.status(400).json({ success: false, message: 'Cannot book a past slot' });
    }

    // determine fee
    const feeMap = {
      chat: reservedDoctor.consultationFee?.chat || 0,
      voice: reservedDoctor.consultationFee?.voice || 0,
      video: reservedDoctor.consultationFee?.video || 0,
      'in-person': reservedDoctor.consultationFee?.video || 0
    };
    const fee = feeMap[type] ?? 0;

    const appointment = new Appointment({
      patient,
      doctor: doctorId,
      type,
      scheduledAt: derivedScheduledAt,
      slotId,
      fee,
      notes: notes || ''
    });

    try {
      await appointment.save();
    } catch (saveErr) {
      // rollback slot reservation if appointment creation fails
      await Doctor.updateOne(
        { _id: doctorId, 'slots._id': slotId },
        { $set: { 'slots.$.isBooked': false } }
      );
      throw saveErr;
    }

    // return safe appointment details
    const safe = {
      _id: appointment._id,
      patient: appointment.patient,
      doctor: appointment.doctor,
      type: appointment.type,
      scheduledAt: appointment.scheduledAt,
      slotId: appointment.slotId,
      fee: appointment.fee,
      notes: appointment.notes,
      createdAt: appointment.createdAt
    };

    return res.status(201).json({ success: true, data: safe });
  } catch (err) {
    console.error("bookAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// NEW: GET /appointments/availability?doctorId&date=YYYY-MM-DD&type=video
exports.getAvailability = async (req, res) => {
  try {
    const { doctorId, date, type } = req.query;

    const { start, end } = getDayRangeUTC(date);
    console.log(start,end);
    // IMPORTANT: query by range to avoid timezone mismatch
    let doc = await BookingHistoryDoctor.findOne({
      doctorId,
      date: { $gte: start, $lt: end },
    }).lean();
    console.log(doc);

    // If not found, auto-generate from Doctor.availability and upsert
    if (!doc) {
      doc = await ensureBookingHistoryExists({ doctorId, dateStr: date, type });
      // if doctor missing
      if (doc === null) return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const slots = (doc?.slots || [])
      .filter((s) => s.status === "free")
      .filter((s) => (type ? s.type === type : true))
      .map((s) => ({
        type: s.type,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
      }));

    return res.json({ success: true, data: { doctorId, date, type: type || null, slots } });
  } catch (err) {
    console.error("getAvailability error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// NEW: POST /appointments/book-slot (bookingHistoryDoctor -> Appointment)
exports.bookSlot = async (req, res) => {
  try {
    const { patientId, doctorId, date, type, startTime, endTime, notes } = req.body || {};
    const { start, end } = getDayRangeUTC(date);

    // ensure booking history exists; if not, generate using doctor availability
    const ensured = await ensureBookingHistoryExists({ doctorId, dateStr: date, type });
    if (ensured === null) return res.status(404).json({ success: false, message: "Doctor not found" });

    // derive scheduledAt from date + startTime (UTC)
    const scheduledAt = new Date(`${date}T00:00:00.000Z`);
    const parsed = parseHHMM(startTime);
    if (parsed) scheduledAt.setUTCHours(parsed.hh, parsed.mm, 0, 0);

    if (scheduledAt.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: "Cannot book a past slot" });
    }

    // Atomically reserve only if currently free (range date match)
    const result = await BookingHistoryDoctor.updateOne(
      {
        doctorId,
        date: { $gte: start, $lt: end },
        slots: { $elemMatch: { type, startTime, endTime, status: "free" } },
      },
      {
        $set: {
          "slots.$.status": "booked",
          "slots.$.patientId": patientId,
        },
      }
    );

    if (!result.matchedCount) {
      return res.status(409).json({ success: false, message: "Slot not available (already booked / missing)." });
    }

    const doctor = await Doctor.findById(doctorId).lean();
    const feeMap = {
      chat: doctor?.consultationFee?.chat || 0,
      voice: doctor?.consultationFee?.voice || 0,
      video: doctor?.consultationFee?.video || 0,
      "in-person": doctor?.consultationFee?.video || 0,
    };
    const fee = feeMap[type] ?? 0;

    const appointment = new Appointment({
      patient: patientId,
      doctor: doctorId,
      type,
      scheduledAt,
      fee,
      notes: notes || "",
      slotMeta: { date, type, startTime, endTime },
    });

    try {
      await appointment.save();
    } catch (saveErr) {
      // rollback slot if appointment save fails
      await BookingHistoryDoctor.updateOne(
        {
          doctorId,
          date: { $gte: start, $lt: end },
          slots: { $elemMatch: { type, startTime, endTime, status: "booked", patientId } },
        },
        { $set: { "slots.$.status": "free", "slots.$.patientId": null } }
      );
      throw saveErr;
    }

    return res.status(201).json({
      success: true,
      data: {
        _id: appointment._id,
        patient: appointment.patient,
        doctor: appointment.doctor,
        type: appointment.type,
        scheduledAt: appointment.scheduledAt,
        fee: appointment.fee,
        notes: appointment.notes,
        createdAt: appointment.createdAt,
      },
    });
  } catch (err) {
    console.error("bookSlot error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getDayRangeUTC = (dateStr /* YYYY-MM-DD */) => {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const parseHHMM = (hhmm) => {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm || ""));
  if (!m) return null;
  return { hh: Number(m[1]), mm: Number(m[2]) };
};

const minutesToHHMM = (mins) => {
  const hh = String(Math.floor(mins / 60)).padStart(2, "0");
  const mm = String(mins % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

const generateSlotsForDay = ({ from, to, durationMinutes, type }) => {
  const pFrom = parseHHMM(from);
  const pTo = parseHHMM(to);
  if (!pFrom || !pTo) return [];

  const startM = pFrom.hh * 60 + pFrom.mm;
  const endM = pTo.hh * 60 + pTo.mm;
  const dur = Math.max(5, Math.min(Number(durationMinutes) || 15, 180));

  if (endM <= startM) return [];

  const out = [];
  for (let t = startM; t + dur <= endM; t += dur) {
    out.push({
      type,
      startTime: minutesToHHMM(t),
      endTime: minutesToHHMM(t + dur),
      status: "free",
      patientId: null,
    });
  }
  return out;
};

const ensureBookingHistoryExists = async ({ doctorId, dateStr, type }) => {
  const { start, end } = getDayRangeUTC(dateStr);

  // already exists for this day (any time normalization)
  const existing = await BookingHistoryDoctor.findOne({
    doctorId,
    date: { $gte: start, $lt: end },
  }).lean();
  if (existing) return existing;

  const doctor = await Doctor.findById(doctorId).lean();
  if (!doctor) return null;

  const from = doctor?.availability?.from;
  const to = doctor?.availability?.to;
  if (!from || !to) {
    // no availability window -> treat as no slots
    await BookingHistoryDoctor.updateOne(
      { doctorId, date: start },
      { $setOnInsert: { doctorId, date: start, slots: [], dayStatus: "open" } },
      { upsert: true }
    );
    return await BookingHistoryDoctor.findOne({ doctorId, date: start }).lean();
  }

  const slots = generateSlotsForDay({
    from,
    to,
    durationMinutes: doctor?.slotDurationMinutes,
    type: type || "video",
  });

  await BookingHistoryDoctor.updateOne(
    { doctorId, date: start },
    { $setOnInsert: { doctorId, date: start, slots, dayStatus: "open" } },
    { upsert: true }
  );

  return await BookingHistoryDoctor.findOne({ doctorId, date: start }).lean();
};