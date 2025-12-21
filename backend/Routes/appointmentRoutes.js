const express = require('express');
const router = express.Router();
const appointmentController = require('../Controllers/appointmentContoller');
const appointmentMiddleware = require('../middlewares/appointmentMiddleware');

router.get('/search', appointmentController.searchDoctors);

// get one doctor for booking flow
router.get('/doctor/:id', appointmentController.getDoctor);

// availability for a doctor on a date + mode (from bookingHistoryDoctor)
router.get('/availability',
  appointmentMiddleware.validateAvailabilityQuery,
  appointmentController.getAvailability
);

// atomic "check + book" against booking history (prevents double booking)
router.post(
  '/book-slot',
  appointmentMiddleware.validateBookSlotBody,
  appointmentController.bookSlot
);

// POST /appointments/book (legacy / existing)
router.post('/book', appointmentController.bookAppointment);

module.exports = router;