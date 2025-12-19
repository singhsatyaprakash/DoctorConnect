const express = require('express');
const router = express.Router();
const doctorController = require('../Controllers/doctorController');
const doctorMiddleware = require('../middlewares/doctorMiddleware');

// Public routes
router.post('/register', doctorController.registerDoctor);
router.post('/login', doctorMiddleware.doctorLoginLimiter, doctorController.loginDoctor);
router.get('/available', doctorController.getAvailableDoctors);

// Protected routes (require authentication)
router.get('/profile', doctorMiddleware.authenticateDoctor, doctorController.getDoctorProfile);
router.put('/profile', doctorMiddleware.authenticateDoctor, doctorController.updateDoctorProfile);

// Admin routes (optional - for admin panel)
router.get('/all', doctorMiddleware.authenticateDoctor, doctorController.getAllDoctors);

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Doctor routes are working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;