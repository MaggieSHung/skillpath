# SkillPath

Professional data & technology skills platform for remote-ready careers.

## Structure

```
skillpath/
├── frontend/          # HTML/CSS/JS — deployed to Vercel
│   ├── index.html
│   ├── dashboard.html
│   ├── catalog.html
│   ├── assessments.html
│   ├── config.js      # API base URL — update after backend deploy
│   └── vercel.json    # Vercel routing config
│
└── backend/           # Node.js + Express — deployed to Railway
    ├── server.js
    ├── package.json
    ├── railway.json
    ├── .env.example   # Copy to .env and fill in secrets
    ├── db/
    ├── routes/
    └── middleware/
```

## Local development

### Backend
```bash
cd backend
cp .env.example .env      # fill in JWT_SECRET
npm install
node db/verify.js         # confirm DB setup
npm run dev               # starts on http://localhost:3000
```

### Frontend
Open `frontend/index.html` in a browser, or use Live Server in VS Code.
`config.js` auto-detects localhost and points to your local backend.

## Deployment

| Service  | What it hosts  | Cost        |
|----------|----------------|-------------|
| Vercel   | frontend/      | Free        |
| Railway  | backend/       | Free tier   |

See deployment guide for step-by-step instructions.
