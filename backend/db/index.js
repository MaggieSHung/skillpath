const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const query = (text, params) => pool.query(text, params);

const initSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
      description TEXT NOT NULL, level TEXT NOT NULL, track TEXT NOT NULL,
      duration_weeks INTEGER NOT NULL, lesson_count INTEGER NOT NULL,
      project_count INTEGER NOT NULL, price_usd NUMERIC NOT NULL,
      price_idr INTEGER NOT NULL, badge TEXT, icon TEXT,
      is_active INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id, course_id)
    );
    CREATE TABLE IF NOT EXISTS progress (
      id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      lesson_index INTEGER NOT NULL, completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, course_id, lesson_index)
    );
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
      course_id INTEGER NOT NULL REFERENCES courses(id),
      order_id TEXT NOT NULL UNIQUE, midtrans_token TEXT,
      amount_idr INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      midtrans_status TEXT, paid_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Schema ready');
};

const seedCourses = async () => {
  const { rows } = await pool.query('SELECT COUNT(*) AS n FROM courses');
  if (parseInt(rows[0].n) > 0) return;
  const courses = [
    { slug:'excel-google-sheets', title:'Excel & Google Sheets Mastery', description:'The universal data tool every company relies on. Build real skills from day one.', level:'beginner', track:'data-analytics', duration_weeks:6, lesson_count:24, project_count:5, price_usd:49, price_idr:790000, badge:'Essential', icon:'📊' },
    { slug:'sql-for-data-analysis', title:'SQL for Data Analysis', description:'Query real databases and extract insights. The skill most data job listings require.', level:'beginner', track:'data-analytics', duration_weeks:8, lesson_count:32, project_count:6, price_usd:69, price_idr:1099000, badge:'Most popular', icon:'🗄️' },
    { slug:'python-for-data', title:'Python for Data (pandas)', description:'Work with real datasets using Python. Automate analysis that would take hours in Excel.', level:'intermediate', track:'data-analytics', duration_weeks:10, lesson_count:38, project_count:7, price_usd:89, price_idr:1399000, badge:'In-demand', icon:'🐍' },
    { slug:'data-visualization-dashboards', title:'Data Visualization & Dashboards', description:'Turn data into decisions. Build Power BI and Tableau dashboards.', level:'intermediate', track:'data-analytics', duration_weeks:8, lesson_count:30, project_count:6, price_usd:79, price_idr:1249000, badge:'Job-ready', icon:'📈' },
  ];
  for (const c of courses) {
    await pool.query(
      'INSERT INTO courses (slug,title,description,level,track,duration_weeks,lesson_count,project_count,price_usd,price_idr,badge,icon) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (slug) DO NOTHING',
      [c.slug,c.title,c.description,c.level,c.track,c.duration_weeks,c.lesson_count,c.project_count,c.price_usd,c.price_idr,c.badge,c.icon]
    );
  }
  console.log('Seeded 4 courses');
};

const init = async () => {
  try { await initSchema(); await seedCourses(); console.log('Database ready (Supabase)'); }
  catch (err) { console.error('DB init failed:', err.message); process.exit(1); }
};
init();
module.exports = { query, pool };
