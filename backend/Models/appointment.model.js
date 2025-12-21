const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true
    },

    // consultation type: in-person | video | chat | voice
    type: {
      type: String,
      enum: ["in-person", "video", "chat", "voice"],
      required: true
    },

    // scheduled date/time for the appointment
    scheduledAt: {
      type: Date,
      required: true
    },

    // reference to the embedded Doctor.slots subdocument that was booked
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    // fee charged at booking time (copied from doctor.consultationFee[type])
    fee: {
      type: Number,
      default: 0
    },

    // status of appointment lifecycle
    status: {
      type: String,
      enum: ["booked", "cancelled", "completed"],
      default: "booked"
    },

    // optional notes from patient or admin
    notes: {
      type: String,
      default: ""
    },

    // payment state
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "waived"],
      default: "pending"
    }
  },
  { timestamps: true }
);

// instance method: return safe public appointment object
appointmentSchema.methods.getPublicDetails = function () {
  const obj = this.toObject({ getters: true, virtuals: false });
  // keep useful fields only
  delete obj.__v;
  return obj;
};

// static: find appointments by patient id
appointmentSchema.statics.findByPatient = function (patientId) {
  if (!patientId) return Promise.resolve([]);
  return this.find({ patient: patientId }).sort({ scheduledAt: -1 });
};

// static: find upcoming appointments for a doctor
appointmentSchema.statics.findUpcomingByDoctor = function (doctorId) {
  if (!doctorId) return Promise.resolve([]);
  return this.find({ doctor: doctorId, scheduledAt: { $gte: new Date() }, status: "booked" }).sort({ scheduledAt: 1 });
};

module.exports = mongoose.model("Appointment", appointmentSchema);
