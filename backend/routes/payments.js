const express = require('express');
const midtransClient = require('midtrans-client');
const crypto = require('crypto');
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── Midtrans Snap client ─────────────────────────────
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey:    process.env.MIDTRANS_SERVER_KEY,
  clientKey:    process.env.MIDTRANS_CLIENT_KEY,
});

// ── POST /api/payments/create ────────────────────────
// Creates a Midtrans Snap transaction and returns the snap_token
router.post('/create', authenticate, async (req, res) => {
  const { course_id } = req.body;
  if (!course_id) return res.status(400).json({ error: 'course_id is required' });

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(course_id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  // Already enrolled?
  const enrolled = db.prepare(
    'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
  ).get(req.user.id, course_id);
  if (enrolled) return res.status(409).json({ error: 'Already enrolled in this course' });

  // Already has a pending payment?
  const pending = db.prepare(
    "SELECT * FROM payments WHERE user_id = ? AND course_id = ? AND status = 'pending'"
  ).get(req.user.id, course_id);
  if (pending && pending.midtrans_token) {
    // Reuse the existing snap token instead of creating a new charge
    return res.json({
      message: 'Existing pending payment found',
      order_id:   pending.order_id,
      snap_token: pending.midtrans_token,
      client_key: process.env.MIDTRANS_CLIENT_KEY,
      course: { id: course.id, title: course.title, price_idr: course.price_idr },
    });
  }

  const order_id = `SP-${req.user.id}-${course_id}-${Date.now()}`;

  // Get user details for Midtrans customer data
  const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.user.id);
  const nameParts = user.name.trim().split(' ');
  const firstName = nameParts[0];
  const lastName  = nameParts.slice(1).join(' ') || '-';

  const parameter = {
    transaction_details: {
      order_id,
      gross_amount: course.price_idr,
    },
    credit_card: {
      secure: true,
    },
    item_details: [
      {
        id:       String(course.id),
        price:    course.price_idr,
        quantity: 1,
        name:     course.title.substring(0, 50), // Midtrans max 50 chars
      },
    ],
    customer_details: {
      first_name: firstName,
      last_name:  lastName,
      email:      user.email,
    },
  };

  try {
    const transaction = await snap.createTransaction(parameter);

    // Save payment record with the real snap token
    db.prepare(`
      INSERT INTO payments (user_id, course_id, order_id, midtrans_token, amount_idr, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(req.user.id, course_id, order_id, transaction.token, course.price_idr);

    res.json({
      message:    'Payment order created',
      order_id,
      snap_token: transaction.token,
      client_key: process.env.MIDTRANS_CLIENT_KEY,
      course: { id: course.id, title: course.title, price_idr: course.price_idr },
    });

  } catch (err) {
    console.error('Midtrans error:', err);
    res.status(502).json({ error: 'Failed to create payment. Please try again.' });
  }
});

// ── POST /api/payments/webhook ───────────────────────
// Midtrans sends payment status updates here.
// Set this URL in Midtrans Dashboard → Settings → Configuration → Payment Notification URL
router.post('/webhook', express.json(), (req, res) => {
  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
    fraud_status,
  } = req.body;

  // ── Verify signature ──────────────────────────────
  // Midtrans signs: SHA512(order_id + status_code + gross_amount + server_key)
  const expected = crypto
    .createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
    .digest('hex');

  if (signature_key !== expected) {
    console.warn('Webhook signature mismatch — ignored');
    return res.status(403).json({ error: 'Invalid signature' });
  }

  // ── Determine our internal status ────────────────
  let internalStatus = 'pending';
  const isPaid =
    (transaction_status === 'capture' && fraud_status === 'accept') ||
    transaction_status === 'settlement';
  const isFailed =
    ['cancel', 'deny', 'expire'].includes(transaction_status);

  if (isPaid)   internalStatus = 'paid';
  if (isFailed) internalStatus = 'failed';

  // ── Update payment record ─────────────────────────
  const payment = db.prepare(
    'SELECT * FROM payments WHERE order_id = ?'
  ).get(order_id);

  if (!payment) {
    console.warn(`Webhook: order_id ${order_id} not found`);
    return res.status(404).json({ error: 'Order not found' });
  }

  db.prepare(`
    UPDATE payments
    SET status = ?, midtrans_status = ?, paid_at = ?
    WHERE order_id = ?
  `).run(
    internalStatus,
    transaction_status,
    isPaid ? new Date().toISOString() : null,
    order_id,
  );

  // ── Enroll student on successful payment ──────────
  if (isPaid) {
    const alreadyEnrolled = db.prepare(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
    ).get(payment.user_id, payment.course_id);

    if (!alreadyEnrolled) {
      db.prepare(
        'INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)'
      ).run(payment.user_id, payment.course_id);
      console.log(`✅ Enrolled user ${payment.user_id} in course ${payment.course_id}`);
    }
  }

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

// ── GET /api/payments/status/:orderId ────────────────
// Frontend polls this after payment to confirm enrollment
router.get('/status/:orderId', authenticate, (req, res) => {
  const payment = db.prepare(
    'SELECT p.*, c.title AS course_title, c.slug AS course_slug FROM payments p JOIN courses c ON c.id = p.course_id WHERE p.order_id = ? AND p.user_id = ?'
  ).get(req.params.orderId, req.user.id);

  if (!payment) return res.status(404).json({ error: 'Order not found' });

  res.json({ payment });
});

module.exports = router;
