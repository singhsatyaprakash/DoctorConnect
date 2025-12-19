const Patient = require('../Models/patient.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Register patient
const registerPatient = async (req, res) => {
  try {
    const { name, email, phone, password, age } = req.body;

    if (!name || !email || !phone || !password || age === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, phone, password and age' });
    }

    const existing = await Patient.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);

    const patient = new Patient({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashed,
      age: Number(age)
    });

    await patient.save();

    const token = jwt.sign({ id: patient._id, email: patient.email, role: 'patient' }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', { expiresIn: '7d' });

    const publicData = patient.toObject();
    delete publicData.password;
    delete publicData.__v;
    delete publicData.token;

    res.status(201).json({ success: true, message: 'Patient registered', data: { patient: publicData, token, redirectTo: '/patient/dashboard' } });
  } catch (error) {
    console.error('Patient register error:', error);
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Email already exists' });
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Login patient
const loginPatient = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Provide email and password' });

    const patient = await Patient.findOne({ email: email.toLowerCase() });
    if (!patient) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, patient.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (patient.isBlocked) return res.status(403).json({ success: false, message: 'Account blocked' });

    const token = jwt.sign({ id: patient._id, email: patient.email, role: 'patient' }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', { expiresIn: '7d' });

    patient.token = token;
    patient.lastLogin = Date.now();
    await patient.save();

    const publicData = patient.toObject();
    delete publicData.password;
    delete publicData.__v;
    delete publicData.token;

    res.status(200).json({ success: true, message: 'Login successful', data: { patient: publicData, token, redirectTo: '/patient/dashboard' } });
  } catch (error) {
    console.error('Patient login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get patient profile
const getPatientProfile = async (req, res) => {
  try {
    const patient = await Patient.findById(req.user.id).select('-password -__v');
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    console.error('Get patient profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  registerPatient,
  loginPatient,
  getPatientProfile
};
