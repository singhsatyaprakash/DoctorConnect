const isYYYYMMDD = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isHHMM = (s) => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const isValidType = (t) => ["chat", "voice", "video", "in-person"].includes(t);

exports.validateAvailabilityQuery = (req, res, next) => {
  const { doctorId, date, type } = req.query;

  if (!doctorId) return res.status(400).json({ success: false, message: "doctorId is required" });
  if (!date || !isYYYYMMDD(date)) return res.status(400).json({ success: false, message: "date is required (YYYY-MM-DD)" });
  if (type && !isValidType(type)) return res.status(400).json({ success: false, message: "Invalid type" });

  const day = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(day.getTime())) return res.status(400).json({ success: false, message: "Invalid date" });

  return next();
};

exports.validateBookSlotBody = (req, res, next) => {
  const { patientId, doctorId, date, type, startTime, endTime } = req.body || {};

  if (!patientId) return res.status(400).json({ success: false, message: "patientId is required" });
  if (!doctorId) return res.status(400).json({ success: false, message: "doctorId is required" });
  if (!date || !isYYYYMMDD(date)) return res.status(400).json({ success: false, message: "date is required (YYYY-MM-DD)" });
  if (!type || !isValidType(type)) return res.status(400).json({ success: false, message: "type is required (chat/voice/video/in-person)" });
  if (!startTime || !isHHMM(startTime)) return res.status(400).json({ success: false, message: "startTime is required (HH:mm)" });
  if (!endTime || !isHHMM(endTime)) return res.status(400).json({ success: false, message: "endTime is required (HH:mm)" });

  const day = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(day.getTime())) return res.status(400).json({ success: false, message: "Invalid date" });

  return next();
};