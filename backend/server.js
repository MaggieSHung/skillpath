require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes     = require('./routes/auth');
const courseRoutes   = require('./routes/courses');
const enrollRoutes   = require('./routes/enrollments');
const progressRoutes = require('./routes/progress');
const paymentRoutes  = require('./routes/payments');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// Midtrans webhooks send raw bodies — parse JSON for all other routes
app.use((req, res, next) => {
  if (req.path === '/api/payments/webhook') return next();
  express.json()(req, res, next);
});

// ── Health check ─────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '🎓 SkillPath API is running',
    version: '1.0.0',
    endpoints: {
      auth:        '/api/auth',
      courses:     '/api/courses',
      enrollments: '/api/enrollments',
      progress:    '/api/progress',
      payments:    '/api/payments',
    },
  });
});

// ── Routes ───────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/courses',     courseRoutes);
app.use('/api/enrollments', enrollRoutes);
app.use('/api/progress',    progressRoutes);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payments',    paymentRoutes);

// ── 404 handler ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ─────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ────────────────────────────────────────────
// Bind to 0.0.0.0 so Railway's proxy can reach the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎓 SkillPath backend running on port ${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV || 'development'}\n`);
});
