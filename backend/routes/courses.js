const express = require('express');
const db      = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/courses ─────────────────────────────────
// Public — lists all active courses, optionally filtered by track
router.get('/', optionalAuth, (req, res) => {
  const { track } = req.query;

  let query = 'SELECT * FROM courses WHERE is_active = 1';
  const params = [];
  if (track) { query += ' AND track = ?'; params.push(track); }
  query += ' ORDER BY id ASC';

  const courses = db.prepare(query).all(...params);

  // If user is logged in, flag which courses they're enrolled in
  let enrolled = new Set();
  if (req.user) {
    const rows = db.prepare(
      'SELECT course_id FROM enrollments WHERE user_id = ?'
    ).all(req.user.id);
    enrolled = new Set(rows.map(r => r.course_id));
  }

  const data = courses.map(c => ({ ...c, enrolled: enrolled.has(c.id) }));
  res.json({ courses: data });
});

// ── GET /api/courses/:slug ───────────────────────────
// Public — single course detail
router.get('/:slug', optionalAuth, (req, res) => {
  const course = db.prepare(
    'SELECT * FROM courses WHERE slug = ? AND is_active = 1'
  ).get(req.params.slug);

  if (!course) return res.status(404).json({ error: 'Course not found' });

  let isEnrolled = false;
  if (req.user) {
    const row = db.prepare(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
    ).get(req.user.id, course.id);
    isEnrolled = !!row;
  }

  res.json({ course: { ...course, enrolled: isEnrolled } });
});

module.exports = router;
