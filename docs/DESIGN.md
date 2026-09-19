# System Design Document

This document outlines the actual implementation details and architectural decisions for the PricePulse scraping and observability system.

## 1. Scraper Implementation & Anti-Bot Evasion

### Reconnaissance Findings
Initial analysis of the target e-commerce platform revealed:
- **Anti-Bot Challenge:** The site obscures the real DOM with a "Reveal price" button that only activates after detecting human-like mouse interaction.
- **Decoys:** The HTML contains hidden decoy prices, discount blocks, and zero-width characters meant to confuse generic scrapers.
- **Dynamic Content:** Prices and stock levels are injected via JavaScript, necessitating a full browser automation tool rather than simple HTTP requests.

### Playwright Challenge/Reveal Flow
To bypass the challenge, Playwright is configured to wait for the `.price-block` container, perform a simulated human-like mouse interaction (moving the mouse continuously over ~800ms inside the box), and wait for the `button[aria-label="Reveal price"]` to become enabled. The scraper then clicks the reveal button and waits up to 30 seconds for the `.price-success` container to render.

### Price & Stock Extraction
- **Decoy Handling:** The scraper finds the `.price-success` block, selects the specific dynamic price container (`[class*="pv-"]`), and dynamically removes hidden/fake elements (nodes with `aria-hidden="true"`, `data-price="true"`, or classes like `mr-`) from the live DOM before extracting the inner text.
- **Price Extraction:** Extracted text is sanitized to remove currency symbols and commas before parsing into a float.
- **Stock Extraction:** The scraper evaluates specific elements (e.g., `.stock-status`, `.availability`) to determine if a product is "In Stock" or "Out of Stock", converting the text payload into a boolean value.

### Reliability & Timeout Budget
- **Retries:** We implemented a standard 3-attempt retry logic with exponential backoff for network timeouts or challenge failures.
- **Timeout Budget:** Playwright actions are wrapped in hard timeouts (e.g., 30s per page load) to ensure a single hung page does not consume the entire worker thread.

## 2. Concurrency & Database Integrity

### PostgreSQL Scrape Lock
To prevent overlapping cron jobs from scraping the same product concurrently, we implemented a distributed locking mechanism using a `scrape_locks` PostgreSQL table. When a scraper picks up a product, it claims a lock by inserting a record; upon completion or failure, the lock is released.

### Batch Isolation
Scrapes are processed in isolated batches. If a single product in a batch fails due to a network error, it is recorded as a `failed` attempt, but it does not crash the overall run. The `scrape_runs` table tracks the global lifecycle of the batch.

### Idempotency & Database Integrity Invariant
The database schema relies on strict foreign keys (`ON DELETE CASCADE`) between `tracked_products`, `scrape_attempts`, `price_history`, and `alerts`. This ensures that if a tracked product is removed, all associated history is safely deleted. Scrapes are recorded as immutable events—running the same scraper twice in immediate succession will result in identical attempt records and price history points, guaranteeing a complete chronological audit trail of all observability data.

### External Scheduling
To adhere strictly to the infrastructure constraints, no background workers (like Redis/BullMQ) were introduced. Instead, scheduling is completely decoupled and handled by an external provider, **cron-job.org**, which pings the secure `/api/cron/scrape` endpoint every 2 hours.

### Trade-Offs
- **Postgres Locks vs. Redis:** Using Postgres for locking avoids the operational overhead of a Redis instance but may introduce row-contention at a highly scaled volume.
- **Playwright Overhead:** Launching a full Chromium browser instance per batch is CPU/Memory intensive on the Render free tier compared to simple `fetch` requests, but it is the only way to reliably bypass the Javascript challenge.

## 3. AI-Assisted Development Journey

During development, the AI pair programmer assisted in resolving several actual edge cases and implementation bugs:

1. **The 14410830 Parsing Bug:**
   Early iterations of the DOM parser failed to properly handle concatenated text nodes or ignored decimal placements, resulting in severely corrupted numeric values like `14410830` instead of `$14.41`. We resolved this by improving the text extraction and regex sanitization logic.

2. **Frontend "Run Now" Issue:**
   Initially, triggering a manual scrape from the observability dashboard failed. The Next.js frontend was either constructing the API URL incorrectly (resulting in 404s due to missing `/api` prefixes) or hitting CORS issues. We traced this to how `NEXT_PUBLIC_API_URL` was being interpreted and fixed the `lib/api.ts` construction logic.

3. **Render Deployment Testing & TypeScript Types:**
   During the Phase 6 production deployment to Render, the backend build succeeded but crashed on startup with `Cannot find module '/opt/render/project/src/backend/dist/index.js'`. The AI identified that Render's default `npm install` skips `devDependencies`, which stripped TypeScript and `@types/express`. This caused TS build errors like `Could not find a declaration file for module 'express'`. We resolved this by explicitly moving the required build tools to `dependencies`, modifying the `tsconfig.json` `rootDir` and `include` paths, and setting the Render service root correctly.
