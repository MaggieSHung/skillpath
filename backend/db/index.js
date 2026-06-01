const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'skillpath.db');

// Ensure the data directory exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ───────────────────────────────────────────
db.exec(`
  -- Users
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'student', -- 'student' | 'admin'
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Courses
  CREATE TABLE IF NOT EXISTS courses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    slug          TEXT    NOT NULL UNIQUE,
    title         TEXT    NOT NULL,
    description   TEXT    NOT NULL,
    level         TEXT    NOT NULL,  -- 'beginner' | 'intermediate'
    track         TEXT    NOT NULL,  -- e.g. 'data-analytics'
    duration_weeks INTEGER NOT NULL,
    lesson_count   INTEGER NOT NULL,
    project_count  INTEGER NOT NULL,
    price_usd     REAL    NOT NULL,
    price_idr     INTEGER NOT NULL,
    badge         TEXT,              -- 'Essential' | 'Most popular' | etc.
    icon          TEXT,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Enrollments (created after successful payment)
  CREATE TABLE IF NOT EXISTS enrollments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    course_id    INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, course_id)
  );

  -- Lesson progress
  CREATE TABLE IF NOT EXISTS progress (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    course_id    INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_index INTEGER NOT NULL,   -- 0-based lesson number within the course
    completed_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, course_id, lesson_index)
  );

  -- Payments
  CREATE TABLE IF NOT EXISTS payments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    course_id       INTEGER NOT NULL REFERENCES courses(id),
    order_id        TEXT    NOT NULL UNIQUE,  -- our generated ID sent to Midtrans
    midtrans_token  TEXT,                     -- snap token from Midtrans
    amount_idr      INTEGER NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'pending', -- 'pending'|'paid'|'failed'|'refunded'
    midtrans_status TEXT,                     -- raw status from webhook
    paid_at         TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Seed: Data & Analytics courses ───────────────────
const seedCourses = () => {
  const count = db.prepare('SELECT COUNT(*) AS n FROM courses').get().n;
  if (count > 0) return; // already seeded

  const insert = db.prepare(`
    INSERT INTO courses
      (slug, title, description, level, track, duration_weeks, lesson_count, project_count, price_usd, price_idr, badge, icon)
    VALUES
      (@slug, @title, @description, @level, @track, @duration_weeks, @lesson_count, @project_count, @price_usd, @price_idr, @badge, @icon)
  `);

  const courses = [
    {
      slug: 'excel-google-sheets',
      title: 'Excel & Google Sheets Mastery',
      description: 'The universal data tool every company relies on. Build real skills from day one — formulas, PivotTables, dashboards, and Google Sheets automation.',
      level: 'beginner',
      track: 'data-analytics',
      duration_weeks: 6,
      lesson_count: 24,
      project_count: 5,
      price_usd: 49,
      price_idr: 790000,
      badge: 'Essential',
      icon: '📊',
    },
    {
      slug: 'sql-for-data-analysis',
      title: 'SQL for Data Analysis',
      description: 'Query real databases and extract insights. The skill most data job listings require — from basic SELECTs to window functions and CTEs.',
      level: 'beginner',
      track: 'data-analytics',
      duration_weeks: 8,
      lesson_count: 32,
      project_count: 6,
      price_usd: 69,
      price_idr: 1099000,
      badge: 'Most popular',
      icon: '🗄️',
    },
    {
      slug: 'python-for-data',
      title: 'Python for Data (pandas)',
      description: 'Work with real datasets using Python. Automate analysis that would take hours in Excel — pandas, EDA, data cleaning, and Jupyter Notebooks.',
      level: 'intermediate',
      track: 'data-analytics',
      duration_weeks: 10,
      lesson_count: 38,
      project_count: 7,
      price_usd: 89,
      price_idr: 1399000,
      badge: 'In-demand',
      icon: '🐍',
    },
    {
      slug: 'data-visualization-dashboards',
      title: 'Data Visualization & Dashboards',
      description: 'Turn data into decisions. Build Power BI and Tableau dashboards, plus Python charts with Matplotlib, Seaborn, and Plotly.',
      level: 'intermediate',
      track: 'data-analytics',
      duration_weeks: 8,
      lesson_count: 30,
      project_count: 6,
      price_usd: 79,
      price_idr: 1249000,
      badge: 'Job-ready',
      icon: '📈',
    },
  ];

  const seedAll = db.transaction(() => courses.forEach(c => insert.run(c)));
  seedAll();
  console.log(`✅ Seeded ${courses.length} courses`);
};

seedCourses();

console.log(`✅ Database ready at ${DB_PATH}`);

module.exports = db;
