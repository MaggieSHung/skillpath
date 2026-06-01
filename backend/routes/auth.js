const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db        = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── Simple in-memory rate limiter for auth routes ────
// Blocks an IP after 10 attempts in 15 minutes
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

const rateLimitAuth = (req, res, next) => {
  const ip  = req.ip;
  const now = Date.now();
  const rec = attempts.get(ip) || { count: 0, start: now };
  if (now - rec.start > WINDOW_MS) { rec.count = 0; rec.start = now; }
  rec.count++;
  attempts.set(ip, rec);
  if (rec.count > MAX_ATTEMPTS) {
    const retry = Math.ceil((WINDOW_MS - (now - rec.start)) / 60000);
    return res.status(429).json({ error: `Too many attempts. Try again in ${retry} min.` });
  }
  next();
};

// Helper: build a JWT for a user row
const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ── POST /api/auth/register ──────────────────────────
router.post(
  '/register',
  rateLimitAuth,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Check duplicate email
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
    ).run(name, email, hashed);

    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = signToken(user);

    res.status(201).json({ message: 'Account created', token, user });
  }
);

// ── POST /api/auth/login ─────────────────────────────
router.post(
  '/login',
  rateLimitAuth,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { password: _pw, ...safeUser } = user;
    const token = signToken(user);

    res.json({ message: 'Login successful', token, user: safeUser });
  }
);

// ── GET /api/auth/me ─────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// ── PUT /api/auth/profile ────────────────────────────
// Update name and/or email
router.put(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be blank'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email } = req.body;
    const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!current) return res.status(404).json({ error: 'User not found' });

    if (email && email !== current.email) {
      const taken = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
      if (taken) return res.status(409).json({ error: 'Email already in use' });
    }

    db.prepare(
      'UPDATE users SET name = ?, email = ? WHERE id = ?'
    ).run(name ?? current.name, email ?? current.email, req.user.id);

    const updated = db.prepare(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?'
    ).get(req.user.id);
    res.json({ message: 'Profile updated', user: updated });
  }
);

// ── PUT /api/auth/password ───────────────────────────
// Change password — requires current password
router.put(
  '/password',
  authenticate,
  [
    body('current_password').notEmpty().withMessage('Current password required'),
    body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { current_password, new_password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!bcrypt.compareSync(current_password, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashed = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
    res.json({ message: 'Password updated successfully' });
  }
);

module.exports = router;
