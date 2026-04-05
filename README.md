# Heaven Church Admin - Railway Deployment

This is the **Horsens Pinsekirke admin system** converted from Google Apps Script to a Next.js app for deployment on Railway with PostgreSQL.

## What's changed

| Old (Google Apps Script) | New (Next.js + Railway) |
|---|---|
| `google.script.run` API calls | `fetch('/api/gas', ...)` HTTP calls |
| PropertiesService storage | PostgreSQL database via Prisma |
| Google Sheets data | PostgreSQL tables |
| Session in ScriptProperties | Sessions stored in database |
| Template includes (`<?!= include(...) ?>`) | Processed server-side |

All HTML/CSS/UI is kept exactly the same. Only the backend data layer changed.

---

## Setup: GitHub + Railway

### 1. Push to GitHub

```bash
cd "church-app"
git init
git add .
git commit -m "Initial commit: Heaven Church Admin on Railway"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Create Railway project

1. Go to [railway.app](https://railway.app) → New Project
2. **Add PostgreSQL** service: click "+ New" → "Database" → "PostgreSQL"
3. **Add GitHub service**: click "+ New" → "GitHub Repo" → select your repo
4. Railway auto-detects Next.js and deploys

### 3. Set environment variables in Railway

In Railway → your service → Variables, add:

```
DATABASE_URL          = (copy from PostgreSQL service - auto linked)
NEXTAUTH_SECRET       = (generate: openssl rand -base64 32)
APP_URL               = https://your-app.up.railway.app
ADMIN_USERNAME        = Admin
ADMIN_PASSWORD        = Horsens2025
```

> Railway auto-sets `DATABASE_URL` when you link the PostgreSQL service.

### 4. Run database migrations

In Railway → your service → Shell (or locally with the Railway CLI):

```bash
npx prisma db push
node prisma/seed.js
```

Or add to the build command in `railway.toml`:
```toml
buildCommand = "npm run build && npx prisma db push && node prisma/seed.js"
```

---

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your values
cp .env.example .env

# 3. Start local PostgreSQL (or use Railway's DATABASE_URL)
# In .env: DATABASE_URL="postgresql://user:pass@localhost:5432/churchdb"

# 4. Push schema + seed admin user
npx prisma db push
node prisma/seed.js

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000/?page=login](http://localhost:3000/?page=login)

Default credentials: `Admin` / `Horsens2025`

---

## Pages

| URL | Page |
|---|---|
| `/?page=login` | Login |
| `/?page=dashboard` | Dashboard |
| `/?page=kontakter` | Contacts |
| `/?page=medlemmer` | Members |
| `/?page=teams` | Teams |
| `/?page=produktion` | Production Plan |
| `/?page=rengoring` | Cleaning Schedule |
| `/?page=grupper` | Disciple Groups |
| `/?page=events` | Events |
| `/?page=logins` | User Management |

---

## Project Structure

```
church-app/
├── app/
│   ├── api/
│   │   ├── gas/route.ts        # All API calls go here
│   │   └── health/route.ts     # Health check for Railway
│   ├── route.ts                # Page serving (reads ?page= param)
│   └── layout.tsx
├── lib/
│   ├── db.ts                   # Prisma client
│   ├── session.ts              # Session management
│   ├── crypto.ts               # Password hashing
│   ├── router.ts               # Routes function names to handlers
│   └── handlers/               # All backend functions
│       ├── auth.ts
│       ├── contacts.ts
│       ├── members.ts
│       ├── teams.ts
│       ├── events.ts
│       ├── groups.ts
│       ├── production.ts
│       ├── cleaning.ts
│       ├── users.ts
│       └── dashboard.ts
├── pages-html/                 # Original HTML pages (minimally modified)
│   ├── Login.html
│   ├── Dashboard.html
│   └── ...
├── public/
│   └── CommonJS.js             # Replaces google.script.run with fetch()
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── railway.toml
└── package.json
```

---

## Security notes

- Change `ADMIN_PASSWORD` after first login
- Sessions expire after 8 hours (same as original)
- Accounts lock after 7 failed login attempts
- All passwords are bcrypt-hashed
