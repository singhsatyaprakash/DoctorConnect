const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    },
    specialization: {
      type: String,
      required: true
    },
    experience: {
      type: Number, 
      required: true
    },
    qualifications: { type: [String], default: [] },
    languages: { type: [String], default: [] },

    consultationFee: {
      chat: { type: Number, default: 0 },
      voice: { type: Number, default: 0 },
      video: { type: Number, default: 0 }
    },

    contactRevealFee: { // new - fee to reveal contact details
      type: Number,
      default: 50
    },

    isOnline: {
      type: Boolean,
      default: false
    },
    availability: {
      from: { type: String, default: "" },
      to: { type: String, default: "" }
    },

    // NEW: used when generating booking-history slots on-demand
    slotDurationMinutes: {
      type: Number,
      default: 15,
      min: 5,
      max: 180
    },

    // slots for appointment booking
    slots: [
      {
        date: { type: Date, required: true },
        time: { type: String, required: true },
        type: { type: String, enum: ['chat', 'video', 'voice', 'in-person'], required: true },
        isBooked: { type: Boolean, default: false }
      }
    ],

    // Verification
    isVerified: {
      type: Boolean,
      default: false
    },

    verificationDocs: {
      medicalLicense: String,
      governmentId: String
    },
    rating: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    },

    // Profile
    profileImage: {
      type: String,
      default: "",
      trim: true
    },
    bio: {
      type: String,
      default: "",
      trim: true
    },

    // Security & Role
    role: {
      type: String,
      default: "doctor"
    },

    // Account Status
    isBlocked: {
      type: Boolean,
      default: false
    },
    token:{
        type: String,
    },
    lastLogin: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Add instance method to return safe public profile
doctorSchema.methods.getPublicProfile = function() {
  const obj = this.toObject({ getters: true, virtuals: false });
  delete obj.password;
  delete obj.__v;
  delete obj.token;
  return obj;
};

// Add static helper to find by email (case-insensitive)
doctorSchema.statics.findByEmail = function(email) {
  if (!email) return null;
  return this.findOne({ email: email.toLowerCase() });
};

module.exports = mongoose.model("Doctor", doctorSchema);
