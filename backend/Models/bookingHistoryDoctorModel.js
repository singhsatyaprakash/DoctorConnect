/**
 * INSTRUCTIONS (keep this comment):
 * 1) This model stores a doctor's booking history / schedule PER DAY.
 *    - One document represents: (doctorId + date) and contains an array of slots for that day.
 * 2) To show availability on the UI:
 *    - Query by { doctorId, date } and render slots where slot.status === "free".
 * 3) To book a slot:
 *    - Use an atomic update to set slot.status="booked" + slot.patientId when it is currently "free".
 *    - IMPORTANT: do booking confirmation in a transaction (recommended) if you also create an Appointment document elsewhere.
 * 4) To cancel/complete a booking:
 *    - Update the matching slot and set slot.status accordingly, plus optionally store a reason.
 * 5) Ensure you normalize `date` to day boundaries (e.g., midnight UTC or your clinic timezone) BEFORE saving/querying.

*/


const mongoose = require("mongoose");

const { Schema } = mongoose;

/**
 * Slot design:
 * - startTime/endTime: store as "HH:mm" (simple) OR ISO time; pick one and keep consistent across the app.
 * - status:
 *   - "free": available
 *   - "booked": reserved by a patient
 *   - "completed": appointment finished
 *   - "cancelled": booking cancelled
*/

const SlotSchema = new Schema(
  {
    // NEW: consultation mode for this slot (lets UI filter by mode)
    type: {
      type: String,
      enum: ["chat", "voice", "video", "in-person"],
      required: true,
      default: "video",
      index: true,
    },

    startTime: {
        type: String,
        required: true,
        trim: true
    }, // e.g. "09:00"
    endTime: {
        type: String,
        required: true,
        trim: true
    }, // e.g. "09:15"

    status: {
      type: String,
      enum: ["free", "booked", "completed", "cancelled"],
      default: "free",
      index: true,
    },

    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      default: null,
      index: true,
    },

    // Optional metadata
    note: {
        type: String,
        trim: true,
        default: ""
    },
    cancelledReason: {
        type: String,
        trim: true,
        default: ""
    },
  },
  { _id: false }
);

const BookingHistoryDoctorSchema = new Schema(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    /**
     * Date for which these slots apply.
     * Normalize before saving/querying:
     *   const day = new Date(date); day.setHours(0,0,0,0);
    */
    date: {
        type: Date,
        required: true,
        index: true
    },

    /**
     * Slots for the day.
     * Populate this when a doctor sets availability, or generate on demand and upsert.
     */
    slots: {
        type: [SlotSchema],
        default: []
    },

    /**
     * Optional high-level summary status for the day (not required).
     * Useful for admin reports; individual slot statuses still drive availability.
     */
    dayStatus: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
  },
  { timestamps: true }
);

// Prevent duplicate day-doc schedules
BookingHistoryDoctorSchema.index({ doctorId: 1, date: 1 }, { unique: true });

// NEW: helps prevent duplicate slot definitions within the same day doc (best-effort)
BookingHistoryDoctorSchema.index(
  { doctorId: 1, date: 1, "slots.type": 1, "slots.startTime": 1, "slots.endTime": 1 },
  { unique: false }
);

/**
 * Example atomic booking update (pseudo):
 * BookingHistoryDoctor.updateOne(
 *   { doctorId, date, "slots.startTime": "09:00", "slots.status": "free" },
 *   { $set: { "slots.$.status": "booked", "slots.$.patientId": patientId } }
 * )
*/

module.exports = mongoose.model("BookingHistoryDoctor",BookingHistoryDoctorSchema);