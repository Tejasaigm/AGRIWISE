/**
 * Auth Service Routes
 * POST /auth/send-otp    – Send OTP to mobile
 * POST /auth/verify-otp  – Verify OTP, issue JWT
 * POST /auth/login       – Email/password login (dev/admin)
 * POST /auth/refresh     – Refresh JWT
 * POST /auth/logout      – Invalidate refresh token
 */
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../services/db');
const { redisClient } = require('../services/redis');

const JWT_SECRET         = process.env.JWT_SECRET  || 'agriwise_jwt_secret_change_in_production';
const JWT_EXPIRES        = process.env.JWT_EXPIRES  || '7d';
const REFRESH_SECRET     = process.env.REFRESH_SECRET || 'agriwise_refresh_secret_change_in_production';
const OTP_EXPIRY_SECONDS = 300; // 5 minutes

// ── Utilities ─────────────────────────────────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

function issueTokens(user) {
  const payload = { id: user.id, role: user.role, name: user.name, email: user.email };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const refresh = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '30d' });
  return { token, refresh };
}

// ── POST /auth/send-otp ───────────────────────────────────────────────────────
router.post('/send-otp',
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Invalid Indian mobile number'),
  body('role').isIn(['farmer', 'buyer']).withMessage('role must be farmer or buyer'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'VALIDATION_ERROR', details: errors.array() });

    const { phone, role } = req.body;

    // Rate limit: max 5 OTPs per phone per hour
    const rateLimitKey = `otp_limit:${phone}`;
    const count = await redisClient.incr(rateLimitKey);
    if (count === 1) await redisClient.expire(rateLimitKey, 3600);
    if (count > 5) {
      return res.status(429).json({
        error: 'OTP_RATE_LIMIT',
        message: 'Too many OTP requests. Try again in 1 hour.',
      });
    }

    const otp = generateOTP();
    const otpKey = `otp:${phone}`;
    await redisClient.setEx(otpKey, OTP_EXPIRY_SECONDS, JSON.stringify({ otp, role }));

    // In production: integrate SMS gateway (Twilio / MSG91 / Fast2SMS)
    // await sendSMS(phone, `Your AgriWise OTP is: ${otp}. Valid for 5 minutes.`);
    console.log(`[DEV] OTP for ${phone}: ${otp}`); // Remove in production

    res.json({
      message: 'OTP sent successfully',
      expires_in: OTP_EXPIRY_SECONDS,
      // NEVER return OTP in production response:
      ...(process.env.NODE_ENV !== 'production' && { dev_otp: otp }),
    });
  }
);

// ── POST /auth/verify-otp ─────────────────────────────────────────────────────
router.post('/verify-otp',
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Invalid phone number'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name too short'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'VALIDATION_ERROR', details: errors.array() });

    const { phone, otp, name } = req.body;
    const otpKey = `otp:${phone}`;
    const stored = await redisClient.get(otpKey);

    if (!stored) {
      return res.status(401).json({ error: 'OTP_EXPIRED', message: 'OTP has expired or was not sent. Request a new one.' });
    }

    const { otp: storedOtp, role } = JSON.parse(stored);
    if (otp !== storedOtp) {
      return res.status(401).json({ error: 'OTP_INVALID', message: 'Incorrect OTP. Please try again.' });
    }

    // Delete OTP after use (one-time)
    await redisClient.del(otpKey);

    // Upsert user in DB
    let user;
    const existingResult = await query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (existingResult.rows.length > 0) {
      user = existingResult.rows[0];
    } else {
      const insertResult = await query(
        'INSERT INTO users (phone, name, role, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
        [phone, name || `User_${phone.slice(-4)}`, role]
      );
      user = insertResult.rows[0];
    }

    const { token, refresh } = issueTokens(user);

    res.json({
      message: 'Login successful',
      token,
      refresh_token: refresh,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    });
  }
);

// ── POST /auth/login (email/password – for admin & dev) ───────────────────────
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'VALIDATION_ERROR', details: errors.array() });

    const { email, password } = req.body;
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const { token, refresh } = issueTokens(user);
    res.json({
      token,
      refresh_token: refresh,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  }
);

// ── POST /auth/refresh ────────────────────────────────────────────────────────
router.post('/refresh',
  body('refresh_token').notEmpty(),
  async (req, res) => {
    const { refresh_token } = req.body;
    try {
      const decoded = jwt.verify(refresh_token, REFRESH_SECRET);
      const result  = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);
      const user    = result.rows[0];
      if (!user) return res.status(401).json({ error: 'USER_NOT_FOUND' });
      const { token, refresh } = issueTokens(user);
      res.json({ token, refresh_token: refresh });
    } catch {
      res.status(401).json({ error: 'REFRESH_TOKEN_INVALID', message: 'Token expired or invalid' });
    }
  }
);

// ── POST /auth/logout ─────────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  // In production: add token to blocklist in Redis
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
