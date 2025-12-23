const Doctor = require("../Models/doctor.model");
const Appointment = require("../Models/appointment.model");
const DoctorDaySchedule = require("../Models/bookingHistoryDoctorModel");
const mongoose = require("mongoose");

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
    const id = String(req.params.id || '');

    // Defensive: prevents CastError when routes are mis-hit (e.g., "me")
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor id'
      });
    }

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

exports.getAvailability = async (req, res) => {
  try {
    const { doctorId, date, type } = req.query;

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
    const isYYYYMMDD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
    const normTime = (t) => String(t || "").trim();

    if (!doctorId || !date) {
      return res.status(400).json({ success: false, message: "doctorId and date are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(String(doctorId))) {
      return res.status(400).json({ success: false, message: "Invalid doctorId" });
    }
    if (!isYYYYMMDD(date)) {
      return res.status(400).json({ success: false, message: "Invalid date format (expected YYYY-MM-DD)" });
    }

    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    const wantsType = String(type || "video"); // default
    const duration = Number(doctor?.slotDurationMinutes) || 15;

    const feeMap = {
      chat: doctor?.consultationFee?.chat || 0,
      voice: doctor?.consultationFee?.voice || 0,
      video: doctor?.consultationFee?.video || 0,
      "in-person": (doctor?.consultationFee?.video || 0) + 100,
    };
    const fee = feeMap[wantsType] ?? 0;

    // read/create schedule for that day
    let history = await DoctorDaySchedule.findOne({ doctor: doctorId, date: String(date) }).lean();

    // compute baseSlotsTimes either from history (legacy supported) or from doctor availability
    const computeBaseTimesFromDoctor = () => {
      const from = doctor?.availability?.from;
      const to = doctor?.availability?.to;
      if (!from || !to) return { error: "Doctor has no availability configured" };

      const pFrom = parseHHMM(from);
      const pTo = parseHHMM(to);
      if (!pFrom || !pTo) return { error: "Invalid doctor availability time format" };

      const startM = pFrom.hh * 60 + pFrom.mm;
      const endM = pTo.hh * 60 + pTo.mm;
      if (endM <= startM) return { error: "Invalid doctor availability window" };

      const times = [];
      for (let t = startM; t + duration <= endM; t += duration) times.push(minutesToHHMM(t));
      return { times };
    };

    const extractTimes = (arr) => {
      const raw = Array.isArray(arr) ? arr : [];
      const times = raw
        .map((x) => (typeof x === "string" ? x : x?.time))
        .map(normTime)
        .filter(Boolean);
      return Array.from(new Set(times)).sort();
    };

    let baseTimes = extractTimes(history?.freeSlots);

    // If no history or legacy history is empty, generate base times from doctor availability and upsert
    if (!history || baseTimes.length === 0) {
      const computed = computeBaseTimesFromDoctor();
      if (computed.error) return res.status(400).json({ success: false, message: computed.error });

      baseTimes = computed.times;

      try {
        await DoctorDaySchedule.updateOne(
          { doctor: doctorId, date: String(date) },
          {
            $setOnInsert: {
              doctor: doctorId,
              date: String(date),
              slotDurationMinutes: duration,
              // store "base slots" (no type). keep object shape for compatibility
              freeSlots: baseTimes.map((t) => ({ time: t })),
              bookedSlots: [],
            },
          },
          { upsert: true }
        );
      } catch (e) {
        if (e?.code !== 11000) throw e;
      }

      history = await DoctorDaySchedule.findOne({ doctor: doctorId, date: String(date) }).lean();
    }

    const bookedTimes = new Set(
      extractTimes(history?.bookedSlots) // IMPORTANT: do NOT filter by type; a time booked in any mode blocks that time
    );

    const freeTimes = baseTimes.filter((t) => !bookedTimes.has(t));

    return res.json({
      success: true,
      data: {
        doctorId: String(doctorId),
        date: String(date),
        type: wantsType,
        slotDurationMinutes: history?.slotDurationMinutes || duration || 15,
        // UI needs {time, fee}; keep type so frontend can display mode
        slots: freeTimes.map((t) => ({ time: t, type: wantsType, fee })),
        // return all booked slots (any type) so frontend can disable correctly
        bookedSlots: Array.isArray(history?.bookedSlots) ? history.bookedSlots : [],
      },
    });
  } catch (err) {
    console.error("getAvailability error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// NEW helpers (keep local to this file)
const isYYYYMMDD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const isHHMM = (s) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(s || ""));

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

const addMinutesHHMM = (hhmm, minsToAdd) => {
  const p = parseHHMM(hhmm);
  if (!p) return "";
  const total = p.hh * 60 + p.mm + Number(minsToAdd || 0);
  return minutesToHHMM(total);
};

const toScheduledAtUTC = (dateYYYYMMDD, hhmm) => {
  if (!isYYYYMMDD(dateYYYYMMDD) || !isHHMM(hhmm)) return null;
  const [y, m, d] = dateYYYYMMDD.split("-").map(Number);
  const t = parseHHMM(hhmm);
  return new Date(Date.UTC(y, m - 1, d, t.hh, t.mm, 0, 0));
};

const ensureDaySchedule = async ({ doctorId, date, doctorDoc }) => {
  let history = await DoctorDaySchedule.findOne({ doctor: doctorId, date: String(date) });
  if (history) return history;

  const duration = Number(doctorDoc?.slotDurationMinutes) || 15;
  const from = doctorDoc?.availability?.from;
  const to = doctorDoc?.availability?.to;

  const pFrom = parseHHMM(from);
  const pTo = parseHHMM(to);
  if (!pFrom || !pTo) throw new Error("Doctor has no availability configured");

  const startM = pFrom.hh * 60 + pFrom.mm;
  const endM = pTo.hh * 60 + pTo.mm;
  if (endM <= startM) throw new Error("Invalid doctor availability window");

  const times = [];
  for (let t = startM; t + duration <= endM; t += duration) times.push(minutesToHHMM(t));

  await DoctorDaySchedule.updateOne(
    { doctor: doctorId, date: String(date) },
    {
      $setOnInsert: {
        doctor: doctorId,
        date: String(date),
        slotDurationMinutes: duration,
        freeSlots: times.map((time) => ({ time })),
        bookedSlots: [],
      },
    },
    { upsert: true }
  );

  history = await DoctorDaySchedule.findOne({ doctor: doctorId, date: String(date) });
  return history;
};

// NEW: POST /appointments/confirm-payment
exports.confirmPayment = async (req, res) => {
  try {
    const { patientId, doctorId, date, type, time } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(String(patientId)) || !mongoose.Types.ObjectId.isValid(String(doctorId))) {
      return res.status(400).json({ success: false, message: "Invalid patientId/doctorId" });
    }
    if (!isYYYYMMDD(date) || !isHHMM(time)) {
      return res.status(400).json({ success: false, message: "Invalid date/time" });
    }

    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    const feeMap = {
      chat: doctor?.consultationFee?.chat || 0,
      voice: doctor?.consultationFee?.voice || 0,
      video: doctor?.consultationFee?.video || 0,
      "in-person": (doctor?.consultationFee?.video || 0) + 100,
    };
    const fee = Number(feeMap[String(type)] ?? 0);
    const duration = Number(doctor?.slotDurationMinutes) || 15;

    await ensureDaySchedule({ doctorId, date, doctorDoc: doctor });

    // PRE-GENERATE appointment id so bookingHistory can store bookingRef atomically
    const apptId = new mongoose.Types.ObjectId();

    // atomically reserve the slot (by time)
    const reserve = await DoctorDaySchedule.updateOne(
      {
        doctor: doctorId,
        date: String(date),
        bookedSlots: { $not: { $elemMatch: { time: String(time) } } },
      },
      {
        $push: {
          bookedSlots: {
            time: String(time),
            type: String(type),
            fee,
            patient: patientId,
            bookingRef: apptId,
          },
        },
      }
    );

    if (!reserve?.modifiedCount) {
      return res.status(409).json({ success: false, message: "Slot already booked" });
    }

    const scheduledAt = toScheduledAtUTC(String(date), String(time));
    if (!scheduledAt) {
      await DoctorDaySchedule.updateOne(
        { doctor: doctorId, date: String(date) },
        { $pull: { bookedSlots: { time: String(time) } } }
      );
      return res.status(400).json({ success: false, message: "Invalid scheduled time" });
    }

    const appointment = await Appointment.create({
      _id: apptId, // IMPORTANT
      patient: patientId,
      doctor: doctorId,
      type: String(type),
      scheduledAt,
      date: String(date),
      startTime: String(time),
      endTime: addMinutesHHMM(String(time), duration),
      fee,
      status: "booked",
      paymentStatus: "paid",
      slotId: null,
    });

    return res.json({ success: true, data: appointment.getPublicDetails() });
  } catch (err) {
    console.error("confirmPayment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// NEW: GET /appointments/patient/:patientId
exports.getPatientAppointments = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(String(patientId))) {
      return res.status(400).json({ success: false, message: "Invalid patientId" });
    }

    const list = await Appointment.find({ patient: patientId })
      .sort({ scheduledAt: -1 })
      .populate({
        path: "doctor",
        select: "name specialization qualifications languages isVerified isOnline rating totalReviews profileImage experience consultationFee availability slotDurationMinutes"
      })
      .lean();

    // keep response clean (also clean nested doctor)
    const cleaned = list.map((a) => {
      if (a?.doctor && typeof a.doctor === "object") {
        delete a.doctor.__v;
        delete a.doctor.password;
        delete a.doctor.token;
      }
      delete a.__v;
      return a;
    });

    return res.json({ success: true, data: cleaned });
  } catch (err) {
    console.error("getPatientAppointments error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// NEW: POST /appointments/:appointmentId/cancel
exports.cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { patientId, reason } = req.body || {};

    const appt = await Appointment.findById(appointmentId);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
    if (String(appt.patient) !== String(patientId)) return res.status(403).json({ success: false, message: "Forbidden" });
    if (String(appt.status) !== "booked") return res.status(400).json({ success: false, message: "Appointment is not cancellable" });

    appt.status = "cancelled";
    appt.cancelledAt = new Date();
    appt.cancelReason = typeof reason === "string" ? reason : "";
    await appt.save();

    // release booked slot if we have stable identifiers
    if (appt.doctor && appt.date && appt.startTime) {
      await DoctorDaySchedule.updateOne(
        { doctor: appt.doctor, date: String(appt.date) },
        { $pull: { bookedSlots: { time: String(appt.startTime) } } }
      );
    }

    return res.json({ success: true, data: appt.getPublicDetails() });
  } catch (err) {
    console.error("cancelAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// NEW: POST /appointments/cancel-slot
exports.cancelSlot = async (req, res) => {
  try {
    const { doctorId, date, time } = req.body || {};
    await DoctorDaySchedule.updateOne(
      { doctor: doctorId, date: String(date) },
      { $pull: { bookedSlots: { time: String(time) } } }
    );
    return res.json({ success: true, message: "Slot released" });
  } catch (err) {
    console.error("cancelSlot error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// NEW: POST /appointments/:appointmentId/reschedule
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { patientId, date, time } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(String(appointmentId))) {
      return res.status(400).json({ success: false, message: "Invalid appointmentId" });
    }
    if (!mongoose.Types.ObjectId.isValid(String(patientId))) {
      return res.status(400).json({ success: false, message: "Invalid patientId" });
    }
    if (!isYYYYMMDD(date) || !isHHMM(time)) {
      return res.status(400).json({ success: false, message: "Invalid date/time" });
    }

    const appt = await Appointment.findById(appointmentId);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
    if (String(appt.patient) !== String(patientId)) return res.status(403).json({ success: false, message: "Forbidden" });
    if (String(appt.status) !== "booked") return res.status(400).json({ success: false, message: "Only booked appointments can be rescheduled" });

    const doctorId = String(appt.doctor);
    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    const duration = Number(doctor?.slotDurationMinutes) || 15;

    // Ensure schedule exists for the target date
    await ensureDaySchedule({ doctorId, date: String(date), doctorDoc: doctor });

    // Reserve NEW slot first
    const reserve = await DoctorDaySchedule.updateOne(
      {
        doctor: doctorId,
        date: String(date),
        bookedSlots: { $not: { $elemMatch: { time: String(time) } } },
      },
      {
        $push: {
          bookedSlots: {
            time: String(time),
            type: String(appt.type || "video"),
            fee: Number(appt.fee || 0),
            patient: patientId,
            bookingRef: appt._id,
          },
        },
      }
    );

    if (!reserve?.modifiedCount) {
      return res.status(409).json({ success: false, message: "Selected slot is not available" });
    }

    const scheduledAt = toScheduledAtUTC(String(date), String(time));
    if (!scheduledAt) {
      await DoctorDaySchedule.updateOne(
        { doctor: doctorId, date: String(date) },
        { $pull: { bookedSlots: { time: String(time) } } }
      );
      return res.status(400).json({ success: false, message: "Invalid scheduled time" });
    }

    // Keep old slot identifiers to release after update
    const oldDate = appt.date;
    const oldStart = appt.startTime;

    appt.date = String(date);
    appt.startTime = String(time);
    appt.endTime = addMinutesHHMM(String(time), duration);
    appt.scheduledAt = scheduledAt;

    await appt.save();

    // Release OLD slot best-effort
    if (oldDate && oldStart) {
      await DoctorDaySchedule.updateOne(
        { doctor: doctorId, date: String(oldDate) },
        { $pull: { bookedSlots: { time: String(oldStart) } } }
      );
    }

    return res.json({ success: true, data: appt.getPublicDetails() });
  } catch (err) {
    console.error("rescheduleAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// Doctor-side endpoints (NEW)
// ===============================

// GET /appointments/doctor/me?status=all|booked|cancelled|completed
exports.getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = String(req.user?.id || "");
    console.log("Doctor ID:", doctorId);
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const status = String(req.query?.status || "all");
    const filter = { doctor: doctorId };
    if (status && status !== "all") filter.status = status;

    const list = await Appointment.find(filter)
      .sort({ scheduledAt: -1 })
      .populate({ path: "patient", select: "name email phone profileImage" })
      .lean();

    const cleaned = list.map((a) => {
      delete a.__v;
      return a;
    });

    return res.json({ success: true, data: cleaned });
  } catch (err) {
    console.error("getDoctorAppointments error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /appointments/doctor/me/upcoming
exports.getDoctorUpcomingAppointments = async (req, res) => {
  try {
    const doctorId = String(req.user?.id || "");
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const now = new Date();
    const list = await Appointment.find({
      doctor: doctorId,
      status: "booked",
      scheduledAt: { $gte: now },
    })
      .sort({ scheduledAt: 1 })
      .limit(50)
      .populate({ path: "patient", select: "name email phone profileImage" })
      .lean();

    return res.json({ success: true, data: list });
  } catch (err) {
    console.error("getDoctorUpcomingAppointments error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /appointments/:appointmentId/doctor-cancel
exports.doctorCancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body || {};
    const doctorId = String(req.user?.id || "");

    if (!mongoose.Types.ObjectId.isValid(String(appointmentId)) || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: "Invalid ids" });
    }

    const appt = await Appointment.findById(appointmentId);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
    if (String(appt.doctor) !== doctorId) return res.status(403).json({ success: false, message: "Forbidden" });
    if (String(appt.status) !== "booked") {
      return res.status(400).json({ success: false, message: "Appointment is not cancellable" });
    }

    appt.status = "cancelled";
    appt.cancelledAt = new Date();
    appt.cancelReason = typeof reason === "string" ? reason : "";
    await appt.save();

    // release booked slot
    if (appt.doctor && appt.date && appt.startTime) {
      await DoctorDaySchedule.updateOne(
        { doctor: appt.doctor, date: String(appt.date) },
        { $pull: { bookedSlots: { time: String(appt.startTime) } } }
      );
    }

    return res.json({ success: true, data: appt.getPublicDetails() });
  } catch (err) {
    console.error("doctorCancelAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /appointments/:appointmentId/doctor-reschedule
exports.doctorRescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { date, time } = req.body || {};
    const doctorId = String(req.user?.id || "");

    if (!mongoose.Types.ObjectId.isValid(String(appointmentId)) || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: "Invalid ids" });
    }
    if (!isYYYYMMDD(date) || !isHHMM(time)) {
      return res.status(400).json({ success: false, message: "Invalid date/time" });
    }

    const appt = await Appointment.findById(appointmentId);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
    if (String(appt.doctor) !== doctorId) return res.status(403).json({ success: false, message: "Forbidden" });
    if (String(appt.status) !== "booked") {
      return res.status(400).json({ success: false, message: "Only booked appointments can be rescheduled" });
    }

    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    const duration = Number(doctor?.slotDurationMinutes) || 15;

    await ensureDaySchedule({ doctorId, date: String(date), doctorDoc: doctor });

    // reserve NEW slot first
    const reserve = await DoctorDaySchedule.updateOne(
      {
        doctor: doctorId,
        date: String(date),
        bookedSlots: { $not: { $elemMatch: { time: String(time) } } },
      },
      {
        $push: {
          bookedSlots: {
            time: String(time),
            type: String(appt.type || "video"),
            fee: Number(appt.fee || 0),
            patient: appt.patient,
            bookingRef: appt._id,
          },
        },
      }
    );

    if (!reserve?.modifiedCount) {
      return res.status(409).json({ success: false, message: "Selected slot is not available" });
    }

    const scheduledAt = toScheduledAtUTC(String(date), String(time));
    if (!scheduledAt) {
      await DoctorDaySchedule.updateOne(
        { doctor: doctorId, date: String(date) },
        { $pull: { bookedSlots: { time: String(time) } } }
      );
      return res.status(400).json({ success: false, message: "Invalid scheduled time" });
    }

    const oldDate = appt.date;
    const oldStart = appt.startTime;

    appt.date = String(date);
    appt.startTime = String(time);
    appt.endTime = addMinutesHHMM(String(time), duration);
    appt.scheduledAt = scheduledAt;

    await appt.save();

    // release OLD slot
    if (oldDate && oldStart) {
      await DoctorDaySchedule.updateOne(
        { doctor: doctorId, date: String(oldDate) },
        { $pull: { bookedSlots: { time: String(oldStart) } } }
      );
    }

    return res.json({ success: true, data: appt.getPublicDetails() });
  } catch (err) {
    console.error("doctorRescheduleAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};