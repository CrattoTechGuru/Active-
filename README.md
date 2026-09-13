# Active

Hyper-minimalist B2B music distribution platform. Two buttons on the home
canvas — **DISTRIBUTE** and **ANALYSIS** — with royalty splits, pre-save
links, and one-click Stripe Connect cash-out nested inside them.

## Stack

- `backend/` — Express + TypeScript + PostgreSQL + Stripe Connect
- `frontend/` — Next.js (pages router) + TypeScript, no UI framework —
  hand-rolled CSS enforcing the 50% black / 35% red / 15% white palette

## Local setup

### 1. Database

```bash
createdb active_dev
cd backend
cp .env.example .env        # fill in DATABASE_URL etc.
npm install
npm run migrate             # applies src/models/schema.sql
```

### 2. Backend

```bash
cd backend
npm run dev                 # http://localhost:4000
npm test                    # split-engine + payout unit tests
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

The frontend proxies `/api/*` to `BACKEND_URL` in dev (see
`next.config.js`), so no CORS setup is needed locally.

## Before Sprint 2: confirm gateway access

`backend/src/services/apiGateway.service.ts` is a stub. SonoSuite/FUGA
require a manual partner-approval process before issuing API credentials —
this can take longer than a sprint. Start that application now, independent
of the code; don't let it block distribution-pipeline work.

## Going live

This repo is deploy-ready but intentionally doesn't assume a host — wire up
whichever you use:

**Backend + Postgres** (pick one): Railway, Render, or Fly.io all support a
one-command deploy from this `backend/` folder plus a managed Postgres
add-on. Set the env vars from `backend/.env.example` as secrets on the
host, then run `npm run migrate` once against the production
`DATABASE_URL`.

**Frontend**: Vercel is the path of least resistance for Next.js — connect
the repo, set the root directory to `frontend/`, and add
`NEXT_PUBLIC_API_BASE_URL` pointing at your deployed backend.

**Stripe**: switch `STRIPE_SECRET_KEY` from `sk_test_…` to `sk_live_…` only
once you've tested the full cash-out path (including the failure states in
`analysis.controller.ts`) against test mode.

**CI**: `.github/workflows/web-deploy.yml` builds and tests both packages
on every push and PR. The `deploy` job is a placeholder — once you've
picked hosts above, swap the echo statements for the host's official
GitHub Action (e.g. `railwayapp/cli` or Vercel's git integration, which
often doesn't need a workflow step at all).

## Repo layout

```
active-web-app/
├── .github/workflows/web-deploy.yml
├── backend/
│   └── src/
│       ├── config/database.ts
│       ├── controllers/{distribution,analysis}.controller.ts
│       ├── services/{apiGateway,splitEngine,payout}.service.ts
│       ├── routes/{distribution,analysis}.routes.ts
│       ├── middleware/{asyncHandler,errorHandler}.ts
│       ├── models/schema.sql
│       ├── app.ts
│       └── server.ts
├── frontend/
│   └── src/
│       ├── components/{CopyrightFooter,ActionCard}.tsx
│       ├── pages/{index,distribute,analysis}.tsx
│       ├── lib/api.ts
│       └── styles/theme.css
└── README.md
```
