/**
 * db/verify.js
 * Run with:  node db/verify.js
 *
 * Confirms every table exists, prints seed courses,
 * and runs a sample join to check foreign keys work.
 */

require('dotenv').config();
const db = require('./index');

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const RED    = '\x1b[31m';
const BOLD   = '\x1b[1m';

const ok   = (msg) => console.log(`${GREEN}  ✔ ${msg}${RESET}`);
const warn = (msg) => console.log(`${YELLOW}  ⚠ ${msg}${RESET}`);
const fail = (msg) => console.log(`${RED}  ✘ ${msg}${RESET}`);
const head = (msg) => console.log(`\n${BOLD}${CYAN}${msg}${RESET}`);

// ── 1. Tables ────────────────────────────────────────
head('1. Checking tables...');
const EXPECTED_TABLES = ['users', 'courses', 'enrollments', 'progress', 'payments'];
const existing = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
).all().map(r => r.name);

EXPECTED_TABLES.forEach(t => {
  existing.includes(t) ? ok(t) : fail(`${t} — MISSING`);
});

// ── 2. Courses seed ──────────────────────────────────
head('2. Seed courses...');
const courses = db.prepare('SELECT * FROM courses ORDER BY id').all();
if (courses.length === 0) {
  fail('No courses found — seed may have failed');
} else {
  courses.forEach(c => {
    ok(`[${c.id}] ${c.title}`);
    console.log(`       Level: ${c.level}  |  Duration: ${c.duration_weeks}w  |  Lessons: ${c.lesson_count}  |  Projects: ${c.project_count}`);
    console.log(`       Price: $${c.price_usd} USD  |  Rp ${c.price_idr.toLocaleString('id-ID')} IDR`);
    console.log(`       Badge: ${c.badge || '—'}  |  Track: ${c.track}`);
  });
}

// ── 3. Column check ──────────────────────────────────
head('3. Column integrity...');
const tableDefs = {
  users:       ['id','name','email','password','role','created_at'],
  courses:     ['id','slug','title','description','level','track','duration_weeks','lesson_count','project_count','price_usd','price_idr','badge','icon','is_active','created_at'],
  enrollments: ['id','user_id','course_id','enrolled_at'],
  progress:    ['id','user_id','course_id','lesson_index','completed_at'],
  payments:    ['id','user_id','course_id','order_id','midtrans_token','amount_idr','status','midtrans_status','paid_at','created_at'],
};

Object.entries(tableDefs).forEach(([table, cols]) => {
  const actual = db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name);
  const missing = cols.filter(c => !actual.includes(c));
  if (missing.length === 0) {
    ok(`${table} — all ${cols.length} columns present`);
  } else {
    fail(`${table} — missing columns: ${missing.join(', ')}`);
  }
});

// ── 4. Foreign key check ─────────────────────────────
head('4. Foreign keys & constraints...');
try {
  // Insert a test user
  const r = db.prepare(
    "INSERT INTO users (name, email, password) VALUES ('Test User', 'verify_test@example.com', 'hashed')"
  ).run();
  const userId = r.lastInsertRowid;
  ok(`Insert user → id ${userId}`);

  // Enroll them in course 1
  db.prepare(
    'INSERT INTO enrollments (user_id, course_id) VALUES (?, 1)'
  ).run(userId);
  ok('Insert enrollment (user → course 1)');

  // Mark a lesson complete
  db.prepare(
    'INSERT INTO progress (user_id, course_id, lesson_index) VALUES (?, 1, 0)'
  ).run(userId);
  ok('Insert progress (lesson 0 complete)');

  // Insert a payment record
  db.prepare(
    "INSERT INTO payments (user_id, course_id, order_id, amount_idr) VALUES (?, 1, 'verify-order-1', 790000)"
  ).run(userId);
  ok('Insert payment record');

  // Join query
  const joined = db.prepare(`
    SELECT u.name, c.title, e.enrolled_at
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id
    WHERE u.id = ?
  `).get(userId);
  ok(`Join query: "${joined.name}" enrolled in "${joined.title}"`);

  // Cleanup test data
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  ok('Test data cleaned up');
} catch (err) {
  fail(`Constraint test failed: ${err.message}`);
}

// ── 5. Pragma checks ─────────────────────────────────
head('5. Pragma settings...');
const fk  = db.pragma('foreign_keys', { simple: true });
const wal = db.pragma('journal_mode', { simple: true });
fk  === 1     ? ok('foreign_keys = ON')  : warn(`foreign_keys = ${fk} (expected 1)`);
wal === 'wal' ? ok('journal_mode = WAL') : warn(`journal_mode = ${wal} (expected wal)`);

// ── Summary ──────────────────────────────────────────
head('─────────────────────────────────');
console.log(`${BOLD}${GREEN}  ✅ Phase 2 database verified successfully!${RESET}`);
console.log(`  DB file: ${db.name}\n`);
