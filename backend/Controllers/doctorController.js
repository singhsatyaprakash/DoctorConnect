const Doctor = require('../Models/doctor.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Register a new doctor
const registerDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      specialization,
      experience,
      qualifications,
      languages,
      chatFee,
      voiceFee,
      videoFee,
      fromTime,
      toTime
    } = req.body;
    console.log(req.body);

    // Validate required fields
    if (!name || !email || !phone || !password || !specialization || 
        !experience || !chatFee || !voiceFee || 
        !videoFee || !fromTime || !toTime) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields'
      });
    }

    // Check if doctor already exists (use findOne)
    const existingDoctor = await Doctor.findOne({ email: email.toLowerCase() });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'Doctor with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new doctor - map fees and availability to schema shape
    const doctor = new Doctor({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      specialization,
      experience: parseInt(experience),
      qualifications: qualifications ? (Array.isArray(qualifications) ? qualifications : qualifications.split(',').map(q => q.trim())) : [],
      languages: languages ? (Array.isArray(languages) ? languages : languages.split(',').map(lang => lang.trim())) : [],
      consultationFee: {
        chat: parseInt(chatFee),
        voice: parseInt(voiceFee),
        video: parseInt(videoFee)
      },
      availability: {
        from: fromTime,
        to: toTime
      }
    });

    // Save doctor to database
    await doctor.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: doctor._id, 
        email: doctor.email, 
        role: 'doctor' 
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '7d' }
    );

    // Return response
    res.status(201).json({
      success: true,
      message: 'Doctor registered successfully',
      data: {
        doctor: doctor.getPublicProfile(),
        token,
        redirectTo: '/doctor/dashboard'
      }
    });

  } catch (error) {
    console.error('Doctor registration error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Doctor login
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find doctor by email (uses static implemented in model)
    const doctor = await Doctor.findByEmail(email);
    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, doctor.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if doctor is verified ///later on this code will implemented
    // if (!doctor.isVerified) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Account not verified. Please contact administration.'
    //   });
    // }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: doctor._id, 
        email: doctor.email, 
        role: 'doctor' 
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '7d' }
    );

    // Update last login (optional)
    doctor.lastLogin = Date.now();
    await doctor.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        doctor: doctor.getPublicProfile(),
        token,
        redirectTo: '/doctor/dashboard'
      }
    });

  } catch (error) {
    console.error('Doctor login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get doctor profile
const getDoctorProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.user.id).select('-password -__v');
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: doctor
    });

  } catch (error) {
    console.error('Get doctor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update doctor profile
const updateDoctorProfile = async (req, res) => {
  try {
    const updates = req.body;
    const doctorId = req.user.id;

    // Remove restricted fields
    delete updates.email;
    delete updates.password;
    delete updates._id;

    // If updating password, hash it
    if (updates.newPassword) {
      if (!updates.currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set new password'
        });
      }

      const doctor = await Doctor.findById(doctorId);
      const isValidPassword = await bcrypt.compare(updates.currentPassword, doctor.password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      updates.password = await bcrypt.hash(updates.newPassword, 10);
      delete updates.newPassword;
      delete updates.currentPassword;
    }

    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: doctor
    });

  } catch (error) {
    console.error('Update doctor profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all doctors (for admin)
const getAllDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } }
      ];
    }

    const doctors = await Doctor.find(query)
      .select('-password -__v')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Doctor.countDocuments(query);

    res.status(200).json({
      success: true,
      data: doctors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get available doctors for consultation
const getAvailableDoctors = async (req, res) => {
  try {
    const { specialization } = req.query;
    
    const query = { 
      isOnline: true,
      isVerified: true 
    };
    
    if (specialization) {
      query.specialization = { $regex: specialization, $options: 'i' };
    }

    const doctors = await Doctor.find(query)
      .select('name specialization experience rating profileImage consultationFee')
      .sort({ rating: -1 });

    res.status(200).json({
      success: true,
      data: doctors
    });

  } catch (error) {
    console.error('Get available doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  registerDoctor,
  loginDoctor,
  getDoctorProfile,
  updateDoctorProfile,
  getAllDoctors,
  getAvailableDoctors
};