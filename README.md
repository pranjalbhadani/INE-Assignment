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

### 1. Install Dependencies
Run `npm install` in both `/backend` and `/frontend`.

### 2. Environment Variables
You need to configure the following environment variable names (refer to the respective `.env.example` files):

**Backend (`backend/.env`)**
- `PORT`
- `DATABASE_URL`
- `CRON_SECRET`
- `SHOW_BROWSER` (Set to `true` for headed Playwright scraping)

**Frontend (`frontend/.env.local`)**
- `NEXT_PUBLIC_API_URL`

### 3. Start Development Servers
- Backend: `npm run dev --prefix backend`
- Frontend: `npm run dev --prefix frontend`

## Commands
- **Test Commands**:
  - `npm run test --prefix backend` (Backend Unit/Integration Tests)
  - `npm run test:e2e --prefix frontend` (Frontend End-to-End Tests)
  - `npm run type-check --prefix backend` (Backend TypeScript validation)
  - `npm run lint --prefix frontend` (Frontend Linting)

- **Headed Scraper Command**:
  To run the scraper in headed mode and visually watch Playwright circumvent challenges:
  `SHOW_BROWSER=true npm run dev --prefix backend`

## Known Limitations
- High concurrency scraping relies on PostgreSQL locks, which may become a bottleneck at massive scale compared to a distributed queue like Redis.
- Scraper heavily relies on predefined CSS selectors; structural changes to the target DOM require manual updates.
