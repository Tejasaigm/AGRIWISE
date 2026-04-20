/**
 * authenticateJWT middleware
 * Verifies Bearer token on protected routes
 */
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'agriwise_jwt_secret_change_in_production';

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'MISSING_TOKEN', message: 'Authorization header required' });
  }
  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'TOKEN_INVALID', message: 'Token expired or invalid' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: `This endpoint requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

module.exports = { authenticateJWT, requireRole };
