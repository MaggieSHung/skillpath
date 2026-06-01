const express = require('express');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/enrollments ─────────────────────────────
// Returns all courses the logged-in student is enrolled in
router.get('/', authenticate, (req, res) => {
  const rows = db.prepare(`
    SELECT
      c.*,
      e.enrolled_at,
      (SELECT COUNT(*) FROM progress p WHERE p.user_id = ? AND p.course_id = c.id) AS lessons_completed
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ?
    ORDER BY e.enrolled_at DESC
  `).all(req.user.id, req.user.id);

  const courses = rows.map(c => ({
    ...c,
    progress_pct: c.lesson_count > 0
      ? Math.round((c.lessons_completed / c.lesson_count) * 100)
      : 0,
  }));

  res.json({ courses });
});

// ── GET /api/enrollments/:courseId ───────────────────
// Check enrollment status for a specific course
router.get('/:courseId', authenticate, (req, res) => {
  const enrollment = db.prepare(
    'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?'
  ).get(req.user.id, req.params.courseId);

  res.json({ enrolled: !!enrollment, enrollment: enrollment || null });
});

module.exports = router;
