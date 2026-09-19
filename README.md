# PricePulse: Product Price Intelligence

A sophisticated product price intelligence and scraper observability system.

## Project Structure

- `/backend`: Node.js Express server handling tracking, lock orchestration, and playwright web scraping.
- `/frontend`: Next.js React frontend dashboard for live system observability.
- `/database`: Postgres schema migrations and dummy seed data.
- `/docs`: Technical documentation and QA reports.

## Usage

1. **Install dependencies:**
   Run `npm install` in both `/backend` and `/frontend`.

2. **Environment Variables:**
   Create `.env` inside `/backend` modeled after `.env.example`.

3. **Start backend and frontend:**
   Use `npm run dev` in respective directories.

4. **Testing:**
   Run `npm run test:all` from the root directory to execute linting, type-checking, backend unit/integration tests, and frontend E2E playwright tests.
