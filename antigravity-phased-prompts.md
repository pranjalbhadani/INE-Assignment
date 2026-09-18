# Product Price Tracker — Phased Build Prompts (for Antigravity / any agentic coding tool)

Feed these one phase at a time. Read the agent's output/report before starting the next phase — don't queue them all at once. Deadline: Sept 20, 11:59 PM IST, so budget roughly: Phases 0–3 today, Phases 4–7 tomorrow morning, deploy + record + docs tomorrow afternoon.

Each phase prompt is self-contained — paste it as-is.

---

## Phase 0 — Reconnaissance (do this first, no code yet)

```
You are helping me build a submission for a real internship assignment. The assignment
brief is attached (source of truth) — read it fully before doing anything else.

Task: reconnaissance only. Do NOT write scraper or app code yet.

1. Open https://demo.inelabteamdev.com/ in a real browser (headed, so you can see it).
2. Inspect: how products are listed, how search works (is it a site feature or do I need
   to scrape+filter?), whether product data is in the initial HTML or fetched via an API
   call, whether there's a discoverable JSON endpoint, how price is formatted, how stock
   is represented, what happens on slow responses, and whether the same product page ever
   looks different on repeated loads.
3. Open DevTools Network tab and note any XHR/fetch requests, their URLs, and response
   shapes.
4. Deliberately reload/search a few times to see if content is ever delayed, missing, or
   errors out.
5. Write findings to docs/SCRAPER_RECONNAISSANCE.md with: actual selectors/fields, actual
   URL structure, actual price/stock representation, whether JS rendering is required,
   whether an API exists, failure behavior observed, and your recommended scraping
   approach (lightweight HTTP+parsing vs Playwright) with justification.

Stop after this phase and show me the file before proceeding.
```

---

## Phase 1 — Architecture & Schema

```
Based on docs/SCRAPER_RECONNAISSANCE.md and the assignment brief, propose:

1. A monorepo structure: frontend/, backend/, tests/, database/, docs/
2. A Supabase Postgres schema with (at minimum): tracked_products, price_history,
   scrape_attempts, and alerts tables. Include the critical invariant: a price_history row
   may only be written after a scrape attempt succeeds AND validation passes — never on
   timeout, missing price, missing stock, malformed data, or product mismatch. A failed
   attempt still gets a scrape_attempts row; it never gets a price_history row, and it
   never overwrites the last known-good price/stock on the tracked_products row.
3. A scraper module boundary: routes -> controllers -> services -> scraper orchestration ->
   fetcher/parser -> validator -> repository. Scraping logic must not live inside route
   handlers.
4. Retry policy: bounded retries (e.g. max 3) with exponential backoff + jitter, only for
   transient failures (timeouts, network errors, 5xx) — not for permanent ones (invalid
   product, malformed data, selector mismatch).

Write this to docs/DESIGN.md as a plan (not yet the final version — you'll fill in the
"what went wrong / how you fixed it" section later, honestly, based on what actually
happens during development). Show me the schema SQL and directory tree before writing code.
```

---

## Phase 2 — Database + Backend Core

```
Implement:
1. Supabase migration SQL for the schema from Phase 1.
2. Express (or Django) backend with these endpoints:
   GET /api/health
   GET /api/products/search?q=
   GET /api/tracked-products
   POST /api/tracked-products
   GET /api/tracked-products/:id
   DELETE /api/tracked-products/:id
   GET /api/tracked-products/:id/history
   GET /api/tracked-products/:id/scrapes
   POST /api/cron/scrape   (protected by a secret header, never exposed to frontend)
3. Input validation (Zod or equivalent), consistent error responses, Helmet, CORS locked
   to the frontend origin, no secrets in source, .env.example with placeholders only.
4. Prevent duplicate tracking of the same product.

Run the server locally, hit each endpoint, and show me real output (not assumed output).
Do not mark anything done until you've actually run it.
```

---

## Phase 3 — Scraper

```
Implement the scraper based on docs/SCRAPER_RECONNAISSANCE.md's actual findings (not
assumptions). Build:

1. A fetcher (lightweight HTTP+HTML parsing if the recon showed it's sufficient; Playwright
   only if the recon showed JS rendering is genuinely required).
2. A parser that extracts price + stock, with explicit validation — missing price must
   never become 0, missing stock must never become "in stock" or "out of stock" by default.
3. Retry logic per the Phase 1 policy, with structured logs (runId, productId, attempt,
   status, durationMs, failureStage).
4. runSingleProduct(id, options) and runAllTrackedProducts(options), where one product's
   failure never aborts the batch.
5. A headed mode (npm run scrape:headed -- --product <id>) with clear terminal output
   showing attempts, retries, and final outcome.
6. A fixture/test mode (SCRAPER_MODE=fixture) with controlled HTML fixtures for: normal
   page, delayed content, timeout, malformed price, missing stock, changed selector,
   product mismatch — so tests don't depend on the live site.

Actually run the headed scraper against the live site at least twice and show me the real
terminal output, including one run that hits a slow/failed response if you can trigger one.
```

---

## Phase 4 — Frontend

```
Build a clean dashboard (React or Vue) with:
1. Product search (debounced) + track button, clearly distinguishing "found on store" vs
   "already tracked."
2. Product details page: current price/stock, price history chart, scrape log table
   (timestamp, status, attempt, duration, error if any), "Run Now" button.
3. A simple system health view: last cron run, recent failure rate, tracked product count.
4. Visibly distinct loading / success / failure / empty states. Never show a "success"
   result the backend hasn't confirmed.

Keep it functional over flashy — this is a scraper-reliability assignment, not a design
assignment.
```

---

## Phase 5 — Tests

```
Write and RUN (don't just write) tests for:
1. Unit: price/stock parsing, validation rejection cases, retry classification.
2. Scraper (fixture mode): normal extraction, delayed content, timeout+retry, permanent
   failure (no history written), selector drift.
3. API: search, tracking, duplicate tracking, cron auth (valid + invalid), scrape trigger.
4. At least one concurrency test: duplicate cron trigger doesn't create duplicate history.

Paste me the actual test run output. Fix any failures before moving on. Do not report a
test as passing unless it was executed.
```

---

## Phase 6 — Deployment

```
Deploy:
1. Backend to Render (free tier), with all secrets as env vars, cron endpoint protected.
2. Frontend to Vercel, pointed at the deployed backend, CORS verified working.
3. Database on Supabase, with the frontend using no service-role key.
4. Set up a cron-job.org job hitting POST /api/cron/scrape every 2 hours with the secret
   header, and document this in the README.

Verify the live deployed site actually works end-to-end (search -> track -> see it appear
in the dashboard) and tell me the live URL and repo URL. Confirm Render sleeping doesn't
break the cron scrape (test by letting it idle, then triggering cron, and checking it wakes
and completes).
```

---

## Phase 7 — Docs + Honest Audit

```
Finalize:
1. README.md — setup, env vars, schedule, cron config, deployment, known limitations.
2. docs/DESIGN.md — fill in the "what went wrong during AI-assisted development and how it
   was fixed" section with what ACTUALLY happened in this build, not a fabricated story.
3. docs/REQUIREMENTS_CHECKLIST.md mapping each assignment requirement to what's actually
   implemented, honestly marking anything not done as not done.

Then act as a strict reviewer of your own repo: look for silent failures, retry-forever
bugs, fake price/stock values, race conditions on concurrent scrapes, and exposed secrets.
Fix any Critical/High issues you find and re-run affected tests. Report what you found and
fixed — don't just say it's clean.
```
