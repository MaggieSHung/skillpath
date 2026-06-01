const express = require('express');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/payments/create ────────────────────────
// Phase 4 will integrate Midtrans Snap here.
// For now returns a structured placeholder so the frontend can be built.
router.post('/create', authenticate, (req, res) => {
  const { course_id } = req.body;
  if (!course_id) return res.status(400).json({ error: 'course_id is required' });

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(course_id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  // Already enrolled?
  const enrolled = db.prepare(
    'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
  ).get(req.user.id, course_id);
  if (enrolled) return res.status(409).json({ error: 'Already enrolled in this course' });

  const order_id = `SP-${req.user.id}-${course_id}-${Date.now()}`;

  // Record pending payment
  db.prepare(`
    INSERT INTO payments (user_id, course_id, order_id, amount_idr, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(req.user.id, course_id, order_id, course.price_idr);

  res.json({
    message: 'Payment order created (Midtrans integration in Phase 4)',
    order_id,
    course: { id: course.id, title: course.title, price_idr: course.price_idr },
    snap_token: null,  // will be real Midtrans token in Phase 4
  });
});

// ── POST /api/payments/webhook ───────────────────────
// Midtrans sends payment status updates here (Phase 4)
router.post('/webhook', express.json(), (req, res) => {
  console.log('Webhook received:', req.body);
  // Full verification + enrollment logic added in Phase 4
  res.json({ received: true });
});

// ── GET /api/payments/history ────────────────────────
// Student's payment history
router.get('/history', authenticate, (req, res) => {
  const payments = db.prepare(`
    SELECT p.*, c.title AS course_title, c.slug AS course_slug
    FROM payments p
    JOIN courses c ON c.id = p.course_id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `).all(req.user.id);

  res.json({ payments });
});

module.exports = router;
