# PricePulse: Product Price Intelligence

A sophisticated product price intelligence and scraper observability system built to track products, circumvent anti-bot protections, and monitor system health.

## Live Links
- **Frontend Dashboard (Vercel)**: https://ine-assignment-eight.vercel.app
- **Backend API (Render)**: https://ine-assignment-mkg7.onrender.com/api/health
- **Scheduling**: 2-hour interval via cron-job.org hitting `/api/cron/scrape`

## Architecture & Tech Stack
- **Frontend**: Next.js, React, Tailwind CSS, Recharts for price history visualization.
- **Backend**: Node.js, Express, TypeScript.
- **Scraper**: Playwright (capable of headless and headed execution).
- **Database**: PostgreSQL (hosted on Supabase).
- **Infrastructure**: Vercel (Frontend), Render (Backend API), cron-job.org (Scheduler).

## Features
- **Automated Price Tracking**: Scrapes designated e-commerce product pages on a 2-hour cron schedule.
- **Anti-Bot & Decoy Evasion**: Simulates human interaction via mouse movements over the `.price-block` to activate a "Reveal price" button; evades decoys by dynamically removing hidden/fake elements (e.g., `aria-hidden="true"`) from the DOM before extracting the text.
- **Database Integrity Invariant**: Strict idempotency constraints and foreign key relationships to maintain accurate price history and scrape attempts.
- **Concurrency Control**: PostgreSQL-backed `scrape_locks` table to isolate batches and prevent overlapping scrapes.
- **Observability Dashboard**: Live system health metrics, 24h success/failure rates, and manual "Run Now" capabilities.

## Repository Structure
- `/backend`: Node.js Express server handling tracking, lock orchestration, and Playwright web scraping.
- `/frontend`: Next.js React frontend dashboard for live system observability.
- `/database`: Postgres schema migrations.
- `/docs`: Technical documentation, QA reports, design constraints, and submission checklists.

## Local Setup

### 1. Prerequisites
- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **PostgreSQL**: Local instance or hosted Supabase database

### 2. Environment Configuration

#### Backend (`backend/.env`)
Copy the example configuration:
```bash
cp backend/.env.example backend/.env
```
Ensure the following variables are configured in `backend/.env`:
- `DATABASE_URL`: PostgreSQL connection string (e.g., Supabase session connection)
- `PORT`: Server port (defaults to `3001`)
- `CRON_SECRET`: Secret token for protecting scrape trigger endpoints
- `FRONTEND_ORIGIN`: Allowed CORS origin for the dashboard (e.g., `http://localhost:3000`)

#### Frontend (`frontend/.env.local`)
Create `frontend/.env.local` if you need to point to a custom API port or remote server (defaults to `http://localhost:3001/api` if omitted):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

### 3. Quick Start (Two Workflows)

> [!IMPORTANT]
> **Working Directory Note**:
> - If running commands with `--prefix <folder>`, ensure your terminal is in the **repository root** (`INE Assignment/`).
> - If you navigate directly into `backend/` or `frontend/` using `cd`, run the standard commands (`npm install`, `npm run dev`) **without** the `--prefix` flag.

#### Method A: Running from Repository Root

Open two separate terminals in the repository root:

1. **Install Dependencies & Playwright**:
   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   npx --prefix backend playwright install chromium
   ```

2. **Run Database Migrations**:
   ```bash
   npm run migrate --prefix backend
   ```

3. **Start Development Servers**:
   - **Terminal 1 (Backend API on http://localhost:3001)**:
     ```bash
     npm run dev --prefix backend
     ```
   - **Terminal 2 (Frontend Dashboard on http://localhost:3000)**:
     ```bash
     npm run dev --prefix frontend
     ```

#### Method B: Running Inside Subdirectories

Open two separate terminals:

- **Terminal 1: Backend**
  ```bash
  cd backend
  npm install
  npx playwright install chromium
  npm run migrate
  npm run dev
  ```

- **Terminal 2: Frontend**
  ```bash
  cd frontend
  npm install
  npm run dev
  ```

---

## Commands Reference

| Action | From Project Root | Inside Subdirectory |
| :--- | :--- | :--- |
| **Backend Dev Server** | `npm run dev --prefix backend` | `cd backend && npm run dev` |
| **Frontend Dev Server** | `npm run dev --prefix frontend` | `cd frontend && npm run dev` |
| **Backend Tests** | `npm run test --prefix backend` | `cd backend && npm test` |
| **Frontend E2E Tests** | `npm run test:e2e --prefix frontend` | `cd frontend && npm run test:e2e` |
| **Backend Type Check** | `npm run type-check --prefix backend` | `cd backend && npm run type-check` |
| **Frontend Lint** | `npm run lint --prefix frontend` | `cd frontend && npm run lint` |
| **Run All Checks** | `npm run test:all` | — |
| **Headed Scraper (Watch Browser)** | `npm run scrape:headed --prefix backend -- --product 675` | `cd backend && npm run scrape:headed -- --product 675` |

## Known Limitations
- High concurrency scraping relies on PostgreSQL locks, which may become a bottleneck at massive scale compared to a distributed queue like Redis.
- Scraper heavily relies on predefined CSS selectors; structural changes to the target DOM require manual updates.
