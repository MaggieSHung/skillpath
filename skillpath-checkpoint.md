# SkillPath Project — Checkpoint

## Project Overview
SkillPath — remote job skill-upgrade course platform (Node/Express + PostgreSQL backend, static HTML/JS frontend).

## Key URLs & Paths
- **Backend repo/local:** `/Users/hungantony/Downloads/skillpath/backend` (GitHub: https://github.com/MaggieSHung/skillpath.git, `main` branch)
- **Frontend local:** `/Users/hungantony/Downloads/skillpath/frontend`
- **Backend live:** https://skillpath-production-4f85.up.railway.app
- **Frontend live:** https://skillpath-iota.vercel.app
- **Database:** Supabase PostgreSQL — `db.mflcuyhwpqodycorhjfn.supabase.co`, pooler `aws-0-ap-southeast-1.pooler.supabase.com:6543`
- **Midtrans:** SANDBOX mode — Server key: `SB-Mid-server-50UG5pgjfiQy_wNeQHXHng1C`, Client key: `SB-Mid-client-AxwIChIG6RoK0zfZ`

## Latest commit: 5ea717a — remove Learning section from sidebar

## Tech Stack
- Backend: Node/Express, `pg` (PostgreSQL), Midtrans Snap + CoreApi, JWT auth, bcrypt
- Frontend: Static HTML/CSS/JS, no framework, shared `config.js`
- Deploy: Railway (backend), Vercel (frontend)

## File Structure
## Courses
### Active (4)
1. Excel & Google Sheets Mastery — $49 / Rp790,000 — slug: `excel-google-sheets`
2. SQL for Data Analysis — $69 / Rp1,099,000 — slug: `sql-data-analysis`
3. Python for Data (pandas) — $89 / Rp1,399,000 — slug: `python-for-data`
4. Data Visualization & Dashboards — $79 / Rp1,249,000 — slug: `data-visualization`

### Coming Soon (4)
5. AWS Cloud Foundations — $79 — track: cloud
6. Linux and DevOps Essentials — $69 — track: cloud
7. Prompt Engineering and LLMs — $59 — track: ai
8. AI Workflow Automation — $69 — track: ai

## What's Fully Working
- Nav: guests see Log in / Get started; logged-in users see Hi [Name] / Dashboard / Log out
- Register/Login modals on index.html and catalog.html
- Guest clicks Enroll → register modal → auto-payment
- Midtrans Snap payment (GoPay, VA, card, ShopeePay) in sandbox mode
- Payment sync fallback POST /api/payments/sync — dashboard shows enrollment even if webhook didn't fire
- dashboard.html — real API data: welcome banner, stat cards, enrolled courses with progress bars and Mark lesson done button (live update, no reload)
- Projects submitted shows 0 (correct — no submissions yet), subtext shows projects available
- Homepage hero widget — wired to real enrollments API for logged-in users (shows Done/In progress/Enrolled/Locked per course and live completion %)
- profile.html — edit name (saves to backend), avatar upload (stored in localStorage), stats cards (enrolled, lessons, member since)
- settings.html — change password (validates via backend), notification toggles (localStorage), sign out
- admin.html — stats, Members tab, Payments tab (protected by role=admin in Supabase)
- Catalog filters — track (Data & Analytics / Cloud & Infrastructure / AI & Automation), level, status, price slider all working
- Coming Soon courses — dimmed cards, lock badge, disabled enroll button
- Sidebar — Main (Dashboard, Course Catalog, Assessments) + Account (Profile, Settings); Learning section removed

## Known Non-Blocking Issues
- Avatar photo is localStorage only (per-browser) — server-side storage needs S3/Supabase Storage
- Git identity warning on every commit — fix: `git config --global user.name "Maggie Hung"` + `git config --global user.email "your@email.com"`
- Midtrans production keys not yet active (502 errors) — stay on sandbox until approved

## Dev Workflow Notes
- File edits via Python scripts using `io.open(..., encoding='utf-8')` and exact string matching
- NO emoji in Python scripts (causes UnicodeEncodeError + can wipe files to 0 bytes)
- NO `#` comment lines in pasted shell blocks (zsh interactive_comments disabled)
- Always verify with `wc -l` after any script edit before committing
- Changes made in Claude's environment don't auto-push — always run the Python fix script locally then git add/commit/push
- Helper scripts (fix_*.py) are safe to delete after use: `rm fix_*.py`

## Curriculum Document
Full course curriculum + 24 portfolio project briefs generated as `SkillPath_Curriculum.docx` (4 courses, 124 lessons, detailed lesson descriptions and skills per lesson).

## Deferred / Lower Priority
- Switch Midtrans to production when sandbox→production account approved
- Custom domain (e.g. skillpath.id)
- Server-side avatar storage (Supabase Storage or S3)
- Lesson content pages (actual video/text per lesson)
- Submissions feature (projects submitted counter, upload flow)
- My Courses, Progress, Certificates pages (sidebar links currently removed)
