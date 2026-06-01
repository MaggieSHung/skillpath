const express = require('express');
const { body, validationResult } = require('express-validator');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/progress ───────────────────────────────
// Mark a lesson as complete (idempotent — safe to call multiple times)
router.post(
  '/',
  authenticate,
  [
    body('course_id').isInt({ min: 1 }),
    body('lesson_index').isInt({ min: 0 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { course_id, lesson_index } = req.body;

    // Must be enrolled first
    const enrollment = db.prepare(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
    ).get(req.user.id, course_id);
    if (!enrollment) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // Upsert — if already marked complete, just return success
    db.prepare(`
      INSERT OR IGNORE INTO progress (user_id, course_id, lesson_index)
      VALUES (?, ?, ?)
    `).run(req.user.id, course_id, lesson_index);

    // Return updated progress summary
    const course = db.prepare('SELECT lesson_count FROM courses WHERE id = ?').get(course_id);
    const completed = db.prepare(
      'SELECT COUNT(*) AS n FROM progress WHERE user_id = ? AND course_id = ?'
    ).get(req.user.id, course_id).n;

    res.json({
      message: 'Lesson marked complete',
      completed_lessons: completed,
      total_lessons: course.lesson_count,
      progress_pct: Math.round((completed / course.lesson_count) * 100),
    });
  }
);

// ── GET /api/progress/:courseId ──────────────────────
// Get all completed lesson indices for a course
router.get('/:courseId', authenticate, (req, res) => {
  const course = db.prepare(
    'SELECT id, lesson_count FROM courses WHERE id = ?'
  ).get(req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const rows = db.prepare(
    'SELECT lesson_index, completed_at FROM progress WHERE user_id = ? AND course_id = ? ORDER BY lesson_index'
  ).all(req.user.id, course.id);

  const completed = rows.map(r => r.lesson_index);

  res.json({
    course_id: course.id,
    completed_lessons: completed,
    total_lessons: course.lesson_count,
    progress_pct: Math.round((completed.length / course.lesson_count) * 100),
    is_complete: completed.length >= course.lesson_count,
  });
});

// ── DELETE /api/progress ─────────────────────────────
// Unmark a lesson (useful for resetting accidentally completed lessons)
router.delete(
  '/',
  authenticate,
  [
    body('course_id').isInt({ min: 1 }),
    body('lesson_index').isInt({ min: 0 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { course_id, lesson_index } = req.body;

    const result = db.prepare(`
      DELETE FROM progress WHERE user_id = ? AND course_id = ? AND lesson_index = ?
    `).run(req.user.id, course_id, lesson_index);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Progress record not found' });
    }

    const course = db.prepare('SELECT lesson_count FROM courses WHERE id = ?').get(course_id);
    const completed = db.prepare(
      'SELECT COUNT(*) AS n FROM progress WHERE user_id = ? AND course_id = ?'
    ).get(req.user.id, course_id).n;

    res.json({
      message: 'Lesson unmarked',
      completed_lessons: completed,
      total_lessons: course.lesson_count,
      progress_pct: Math.round((completed / course.lesson_count) * 100),
    });
  }
);

module.exports = router;
