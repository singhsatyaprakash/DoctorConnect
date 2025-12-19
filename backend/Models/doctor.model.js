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
      lowercase: true
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
    qualifications: [String],
    languages: [String],

    consultationFee: {
      chat: { type: Number, default: 0 },
      voice: { type: Number, default: 0 },
      video: { type: Number, default: 0 }
    },

    isOnline: {
      type: Boolean,
      default: false
    },
    availability: {
      from: String,
      to: String    
    },

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
      default: ""
    },
    bio: {
      type: String
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
