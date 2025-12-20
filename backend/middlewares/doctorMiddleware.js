const jwt = require('jsonwebtoken');

// Simple pass-through login limiter placeholder
const doctorLoginLimiter = (req, res, next) => {
  // Replace with real rate limiting logic if needed
  next();
};

// Authenticate doctor via JWT bearer token
const authenticateDoctor = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  console.log(token);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    console.log('authectication compliatede');
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = {
  doctorLoginLimiter,
  authenticateDoctor
};