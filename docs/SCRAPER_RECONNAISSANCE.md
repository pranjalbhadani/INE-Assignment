# Scraper Reconnaissance Report: Deep Investigation & Evidence

## Executive Summary & Correction of Initial Assessment

In the preliminary phase 0 reconnaissance, it was hypothesized that the demo store simulated a permanent missing-data failure mode because prices and stock were omitted from the initial `/api/catalog` and `/api/product/:id` payloads and the product page displayed "Price hidden".

**That initial inference has been rigorously disproven.**

Following a deep-dive investigation combining headed browser automation, network telemetry, and full JavaScript bundle disassembly (`assets/index-B9UiQq4X.js`), **price and stock are 100% present, live, dynamic, and retrievable**. However, they are protected by an elaborate, multi-layered anti-bot challenge architecture.

---

## 1. Observed Facts vs. Inferences

### OBSERVED FACTS (Empirical Verification)
1. **Initial Endpoints Lack Price/Stock:** 
   - `GET /api/catalog` and `GET /api/product/:id` return clean metadata (`name`, `brand`, `category`, `sku`, `description`, `warranty`, `weightGrams`, `reviews`), but **completely omit** `price` and `stock`.
2. **Interactive Gating Mechanism:**
   - On page load, the price block displays `<p class="price-status">Price hidden</p>` and a `<button aria-label="Reveal price" disabled="">`.
   - The button is disabled via React state (`p !== null`) where `p = a.missing()`.
   - The component requires **at least 8 mouse moves** (`minMoves: 8`) within the price wrapper AND **at least 600ms dwell time** (`minDwellMs: 600`) before `a.missing()` returns `null`.
   - Once mouse movement and dwell criteria are satisfied, the substatus updates to *"Check the current price and availability"* and the button becomes **enabled**.
3. **Challenge & Authorization Network Flow:**
   - Clicking the enabled *"Reveal price"* button initiates the following network sequence:
     1. `GET /api/challenge` -> Returns `{ salt, ts, difficulty, csig, wasm }`.
     2. Client performs client-side proof-of-work (nonce mining where SHA256 hash prefix has $N$ leading zeroes equal to `difficulty`) and executes a WebAssembly bytecode module.
     3. Client generates an attestation payload `att` containing canvas fingerprint, WebGL vendor info, hardware concurrency, frame timings, and mouse trajectory array `moves`.
     4. `POST /api/session` -> Sends `{ nonce, derived, wasmOut, att, productId }` and receives `{ token }`.
     5. `GET /api/products/:id/price` -> Sent with header `Authorization: Bearer <token>`. Returns `{ productId, v: 1, e: "<base64 ciphertext>" }`.
4. **Decryption & DOM Rendering:**
   - The client decrypts payload `e` using an XOR stream cipher keyed by a hash derived from `token`.
   - The decrypted payload contains:
     ```json
     {
       "shown": 130032,
       "mrp": 156665,
       "sale": 143349,
       "badgePct": 17,
       "stock": 102,
       "currency": "INR",
       "at": 1789751926088,
       "rating": 4.6,
       "ratingCount": 39900,
       "seller": "Marlowe & Co",
       "deliveryDays": 4
     }
     ```
   - The price and stock are then rendered into the DOM with `.price-success`.
5. **Anti-Scraping Traps & Honeypots in the DOM:**
   - **Honeypot Decoy Prices:** The client intentionally injects fake decoy prices into hidden elements:
     - `<span class="price-value" aria-hidden="true" style="display: none;">₹1,12,460</span>` (generated via client hash function `Br(shown)`)
     - `<span class="amount" data-price="true" aria-hidden="true" style="display: none;">₹1,29,688</span>` (generated via `Br(shown + 7)`)
   - **Character Splitting with Zero-Width Spaces:** The true visible price is rendered inside the dynamic layout class (e.g. `.pv-k2`), with digits split into individual spans separated by zero-width spaces (`\u200b`), e.g., `<span>₹​</span><span>1​</span><span>3​</span>...`.
   - **Obfuscated Class Names:** CSS class names for price, mrp, stock, and seller are dynamically assigned per session via `GET /api/layout` (e.g. `priceWrap: 'pw-k2'`, `priceValue: 'pv-k2'`, `stock: 'st-k2'`).
   - **Intermittent Cookie Overlay:** A cookie consent dialog (`<div class="cookie-overlay">`) randomly renders (25% chance) with a random delay, setting `body { overflow: hidden }` and intercepting pointer clicks until dismissed.

### INFERENCES (Derived Conclusions)
1. The demo site is an authentic modern anti-scraping benchmark, designed specifically to test whether candidates:
   - Notice missing data in initial APIs.
   - Reverse-engineer obfuscated client bundles or use browser automation with human-like interactions.
   - Avoid naive scraping traps (like pulling hidden decoy prices from `[data-price]`).
   - Properly handle transient retries and rate limits.
2. The assignment requirement ("handle missing price/stock gracefully without polluting price_history") applies to cases where the reveal challenge fails, times out, returns a 429, or when stock is legitimately 0 (`Out of stock`).

---

## 2. Multi-Product Test Evidence

Using headed Playwright automation with mouse trajectory simulation and cookie-overlay dismissal, we successfully revealed and verified real price and stock data across multiple distinct products:

| Product ID | Product Name | MRP | Real Selling Price | Stock Badge | Stock Value | Seller |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **#12** | Basecamp Cloudbook Pro | ₹1,56,665 | **₹1,30,032** | `102 in stock` | 102 | Marlowe & Co |
| **#48** | Meridian Travel Adapter Pro | ₹1,016 | **₹965** | `Selling fast — 88 left` | 88 | Northwind Retail |
| **#675** | Larkspur Trackpad S | ₹29,386 | **₹12,342** (Deal: ₹20,864) | `Out of stock` | 0 | Cobblestone Supply |

### Reload Consistency
Repeated fresh reloads of Product #12 consistently returned the identical base price (`₹1,30,032`) and stock (`102`), confirming deterministic backing data for individual product IDs.

---

## 3. Detailed Technical Breakdown

### A. Actual URL & Endpoint Structure
- **Catalog Search & List:** `GET https://demo.inelabteamdev.com/api/catalog?q={query}&page={page}`
- **Product Metadata:** `GET https://demo.inelabteamdev.com/api/product/{id}`
- **Layout Tokens:** `GET https://demo.inelabteamdev.com/api/layout` (dynamic class dictionary)
- **Challenge:** `GET https://demo.inelabteamdev.com/api/challenge`
- **Session Token:** `POST https://demo.inelabteamdev.com/api/session`
- **Price & Stock Quote:** `GET https://demo.inelabteamdev.com/api/products/{id}/price` (Notice plural `/products/`, requires `Authorization: Bearer <token>`)

### B. Price & Stock Representation
- **Real Price:** Located inside `div.price-main > .pv-k2` (or whatever class `layout.classes.priceValue` maps to). Must be extracted while ignoring children with `display: none` or stripping zero-width spaces (`\u200b`).
- **Real Stock:** Located inside `div.price-facets > .st-k2 .stock-badge`. 
  - When $s > 0$: Has class `.in-stock`, with text matching phrases like `"{N} in stock"`, `"{N} left"`.
  - When $s = 0$: Has class `.out-stock`, with text `"Out of stock"`.

### C. Failure & Flakiness Behavior
- The client component implements an automatic retry loop of up to 6 attempts (`jr = 6`) with linear backoff (`300ms * attempt`).
- Transient network or challenge errors display *"Retrying (attempt X/6)… Store responded with '...' "*.
- Exhausted retries transition to `.price-error` with a *"Try again"* button.
- Rate limiting: If `/api/session` responds with HTTP 429, the client catches `Er(429)` and terminates or backs off.

---

## 4. Recommended Scraping Approach & Justification

### Option A: Pure HTTP + Cryptographic Solver
- **Pros:** Fast execution, minimal memory consumption.
- **Cons:** Extremely brittle. Requires implementing SHA256 proof-of-work mining in Python, hosting a WebAssembly execution runtime (`wasmtime` / `wasmer`) to execute the dynamic WASM binary returned by `/api/challenge`, synthesizing canvas/WebGL fingerprint attestations that pass server-side heuristic validation, and maintaining XOR stream decryption.

### Option B: Playwright Browser Automation (Recommended)
- **Pros:** 
  1. **Native WASM & Fingerprint Execution:** Chromium automatically executes the WebAssembly module, canvas measurements, and frame timings natively without reverse-engineering brittle crypto logic.
  2. **Interactivity Handling:** Simulating 12–15 mouse moves over 700ms reliably satisfies `minMoves` and `minDwellMs` and enables the reveal button.
  3. **Decryption Guarantee:** Chromium receives the decrypted quote directly and renders it to the DOM.
  4. **Resilience to Code Rotation:** If the backend rotates its XOR salt derivation or WASM bytecode, Playwright continues to function unaffected.
- **Cons:** Higher resource overhead per worker than raw HTTP.
- **Mitigation:** Run headless or headed-stealth with a pooled browser context, navigating directly to the targeted product URLs and dismissing any overlays.

---

## 5. Summary of Selectors for Scraping

| Target Field | Selector / Extraction Rule |
| :--- | :--- |
| **Product Name** | `h1.product-title` or API `/api/product/:id` -> `.name` |
| **SKU / Brand** | `.sku-tag`, `.brand-tag` or API `/api/product/:id` -> `.sku`, `.brand` |
| **Price Wrapper** | `.price-block` |
| **Reveal Button** | `button[aria-label="Reveal price"]` |
| **Cookie Dismiss** | `button[aria-label="Accept cookies"]` (or evaluate removal of `.cookie-overlay`) |
| **Real Price** | Visible element in `.price-main` excluding `[style*="display: none"]` and `.mr-*` (MRP); strip `\u200b` and `₹` |
| **Decoy Elements (To Ignore!)** | `.price-value[style*="display: none"]`, `[data-price="true"]` |
| **Stock Status** | `.stock-badge.in-stock` vs `.stock-badge.out-stock` |
