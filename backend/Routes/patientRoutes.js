const express = require('express');
const router = express.Router();
const patientController = require('../Controllers/patientController');
const patientMiddleware = require('../middlewares/patientMiddleware');

// Public
router.post('/register', patientController.registerPatient);
router.post('/login', patientMiddleware.patientLoginLimiter, patientController.loginPatient);

// Protected
router.get('/profile', patientMiddleware.authenticatePatient, patientController.getPatientProfile);

// Test
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Patient routes are working!', timestamp: new Date().toISOString() });
});

module.exports = router;
