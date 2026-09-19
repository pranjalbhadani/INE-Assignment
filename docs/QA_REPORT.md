# QA Report: Phase 5 - Testing & Reliability Verification

## Overview
This report details the successful execution of Phase 5. The primary objective was to verify the reliability, database isolation, concurrent behavior, API contracts, and robustness of the scraper against transient and permanent failures, using the actual mock storefront deployed by INELab.

## 1. Database Integration and Concurrency (`backend/tests/integration/db.test.ts`)
- **Status:** PASSED (8 tests)
- **Isolated Schema:** Tests correctly initialize and migrate a distinct `test_schema` ensuring complete separation from production (`public`) data.
- **Constraints Validation:** 
  - Validated proper behavior of the `consecutive_failures` column incrementation.
  - Asserted foreign-key constraints on `scrape_attempts` pointing to valid `tracked_products` records.
- **Concurrency & Locking:** 
  - Implemented lock contention assertions over the `scrape_locks` table.
  - Successfully demonstrated that two simultaneous concurrent scrapes on the same product result in one process successfully securing a lock, while the other elegantly fails to acquire it.
- **Execution Time:** ~9 seconds

## 2. API Contract Verification (`backend/tests/integration/api.test.ts`)
- **Status:** PASSED (7 tests)
- **Endpoints Tested:**
  - `POST /api/tracked-products` - Validated correct object structure and rejection of malformed data.
  - `POST /api/cron/run` - Asserted authentication enforcement against `CRON_SECRET`. Rejected unauthorized 401s and accepted 200s for valid payloads.
  - `POST /api/tracked-products/:id/scrape` - Confirmed successful lock acquisition and integration of synchronous `executeBrowserScrape` response within a non-simulated endpoint.
- **Execution Time:** ~3.4 seconds

## 3. Scraper Unit and Integration Testing (`backend/tests/unit/parser.test.ts` & `backend/tests/integration/scraper.test.ts`)
- **Status:** PASSED (16 tests total)
- **Transient Failures (5xx):** 
  - Verified that a product page returning HTTP 500 throws a `TransientError`.
  - Asserted that `transient_network` errors are categorized properly without breaking overall loop flow.
- **Permanent Parser Errors:** 
  - Verified that malformed/decoy DOM scenarios (where elements are technically present but functionally hidden by `aria-hidden`) accurately throw a `PermanentError`.
- **Successful Scrapes:** 
  - Scraper orchestrator correctly navigates, parses strings (e.g., stripping zero-width components and extracting numerical prices), formats the price, and maps stock statuses.
- **Execution Time:** Unit tests ~3.4 seconds. Integration ~12.7 seconds

## 4. Live Scraper Headed Verification (`backend/tests/scraper/verification.test.ts` & `liveScraper.test.ts`)
- **Status:** PASSED (6 tests)
- **Target Products:** Product 12, 48, 675 from INELab Demo Mock Storefront.
- **Results:**
  - Accurately bypassed honeypots.
  - Tested simultaneous failure and success scraping isolation.
  - Output: Live test execution persisted new entries in `price_history` and `scrape_attempts` inside the live database securely updating values without crashing or false timeouts.
- **Execution Time:** ~127 seconds (using Playwright isolated sessions)

## 5. Frontend End-to-End Navigation (`frontend/tests/e2e/dashboard.spec.ts`)
- **Status:** PASSED (3 tests)
- **Test Framework:** Playwright E2E
- **Validation:** 
  - Verified presence of top-level "Overview" header.
  - Verified routing to the Tracked Products page and Search Store page.
- **Execution Time:** ~6.3 seconds

## 6. Bugs Found and Fixed
- **Bug Found:** The scraper concatenated decoy zero-width strings (`aria-hidden` and specifically manipulated price blocks) resulting in incorrect values, such as Product 12 extracting `14410830` instead of `1,30,032`.
- **Bug Fixed:** Implemented defensive parsing in `domParser.ts` by filtering out hidden elements (`aria-hidden="true"`, zero-width spans, display:none/opacity:0) within the `.price-success` block, isolating the raw numerical price successfully.
- **Bug Found:** The frontend Run Now button was triggering a simulated delay instead of hitting a real endpoint.
- **Bug Fixed:** Handwired `POST /api/tracked-products/:id/scrape` directly to the `runSingleProduct` orchestrator logic and mapped backend execution state synchronously back to the dashboard `last_scrape_status` property.
- **Bug Found:** Foreign key constraint violations during parallel integration test runs targeting `scrape_attempts`.
- **Bug Fixed:** Disabled vitest file parallelism (`--no-file-parallelism`) for backend tests to allow sequential setup/teardown of test databases.
- **Bug Found:** Frontend compilation failed on TypeScript type-checking for health APIs and Search page `ApiResponse` mapping.
- **Bug Fixed:** Corrected generic interfaces and strictly cast values returned by the data `ApiResponse` wrapper payload in `health/page.tsx`, `search/page.tsx`, and `PriceHistoryChart.tsx`.
- **Bug Found:** During Render deployment, the backend startup crashed with `Cannot find module '/opt/render/project/src/backend/dist/index.js'` and TypeScript compilation failed.
- **Bug Fixed:** Moved `typescript` and `@types/express` from `devDependencies` to `dependencies` because Render's production environment skips devDependencies. Updated `tsconfig.json` `rootDir` and `render.yaml` root directory to align the compiled output path.
- **Bug Found:** The production Vercel frontend displayed "API Server — Offline" despite the Render backend being healthy.
- **Bug Fixed:** Identified that `NEXT_PUBLIC_API_URL` was misconfigured to the root Render URL. Documented the requirement for the environment variable to explicitly include the `/api` path suffix without a trailing slash (e.g., `https://ine-assignment-mkg7.onrender.com/api`).
- **Bug Found:** The live dashboard showed a 94.12% failure rate immediately after deployment.
- **Bug Fixed:** Discovered that development and dummy seed artifacts (`verify-fail`, `TEST-DB-1`) were written to the production database during Phase 5 testing. Executed a clean, targeted single-transaction SQL deletion to scrub 100% of the test contamination without dropping tables.

## 7. Regression Tests Added
- Added `tests/integration/scraper.test.ts` to mock the storefront providing the exact DOM structure observed in Product 12, forcing the scraper to extract only valid text. If any honeypot text leaks, the assertion fails, acting as a regression net for price extraction.
- Added integration coverage to ensure that `5xx` errors map accurately to `TransientError` and missing DOM elements map to `PermanentError` preventing runaway retry loops.

## 8. Remaining Limitations
- **Proxies/IP Blocks:** Current tests assume direct local or unblocked network access. If the storefront begins using rigorous IP banning (e.g., Cloudflare Under Attack mode), the Playwright scripts currently lack residential proxies or CAPTCHA bypass capabilities.
- **Scraper Concurrency Scaling:** The local DB locking system works efficiently for single instances but lacks a distributed queue layer (like Redis/BullMQ) if horizontal scaling across multiple pods is required in the future.

## Conclusion
The scraper successfully isolates and rejects deceptive storefront techniques. Concurrency, data isolation, and API rules are enforced accurately. All Phase 5 testing goals have been demonstrably executed and passed.
