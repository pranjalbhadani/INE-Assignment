-- ============================================================
-- Migration 001: Initial Schema
-- Project: INE Price Tracker
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TRACKED PRODUCTS
-- ============================================================
CREATE TABLE tracked_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_product_id VARCHAR(64) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(128) NOT NULL,
    category VARCHAR(128) NOT NULL,
    sku VARCHAR(128) NOT NULL,
    target_url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Cached values, ONLY updated on successful scrape
    last_known_price NUMERIC(12, 2) NULL,
    last_known_mrp NUMERIC(12, 2) NULL,
    last_known_stock INT NULL,
    last_known_stock_status VARCHAR(32) NULL
        CHECK (last_known_stock_status IN ('in_stock', 'out_of_stock')),

    -- Scrape metadata
    last_scraped_at TIMESTAMPTZ NULL,
    last_scrape_status VARCHAR(32) NOT NULL DEFAULT 'pending'
        CHECK (last_scrape_status IN ('pending', 'success', 'failed')),
    consecutive_failures INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracked_products_store_id ON tracked_products(store_product_id);
CREATE INDEX idx_tracked_products_active ON tracked_products(is_active);

-- ============================================================
-- 2. SCRAPE LOCKS (Application-level concurrency guard)
-- No long-running DB transactions during Playwright execution.
-- ============================================================
CREATE TABLE scrape_locks (
    tracked_product_id UUID PRIMARY KEY
        REFERENCES tracked_products(id) ON DELETE CASCADE,
    lock_token UUID NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- ============================================================
-- 3. SCRAPE RUNS (Overall outcome per product per job)
-- ============================================================
CREATE TABLE scrape_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracked_product_id UUID NOT NULL
        REFERENCES tracked_products(id) ON DELETE CASCADE,
    job_id UUID NOT NULL,  -- Correlation ID for a full batch/cron run
    status VARCHAR(32) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'success', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL,

    -- Composite unique key enables relational FK from scrape_attempts
    CONSTRAINT uq_scrape_runs_id_product UNIQUE (id, tracked_product_id)
);

CREATE INDEX idx_scrape_runs_product_time ON scrape_runs(tracked_product_id, started_at DESC);

-- ============================================================
-- 4. SCRAPE ATTEMPTS (Individual retry audit trail)
-- ============================================================
CREATE TABLE scrape_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scrape_run_id UUID NOT NULL,
    tracked_product_id UUID NOT NULL
        REFERENCES tracked_products(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL
        CHECK (status IN ('success', 'failed')),
    duration_ms INT NOT NULL,

    -- Failure diagnostics
    failure_stage VARCHAR(64) NULL CHECK (failure_stage IN (
        'navigation', 'cookie_dismissal', 'interaction_hover',
        'challenge_token', 'price_fetch', 'dom_render',
        'parsing', 'validation', 'identity_mismatch', 'timeout'
    )),
    error_type VARCHAR(64) NULL CHECK (error_type IN (
        'transient_timeout', 'transient_network', 'transient_5xx',
        'transient_rate_limit', 'permanent_validation',
        'permanent_identity_mismatch', 'permanent_selector_missing',
        'permanent_parse_error'
    )),
    error_message TEXT NULL,

    -- Raw strings for debugging
    raw_price_text TEXT NULL,
    raw_stock_text TEXT NULL,

    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Composite FK: ensures attempt.tracked_product_id === run.tracked_product_id
    CONSTRAINT fk_scrape_attempts_run_product
        FOREIGN KEY (scrape_run_id, tracked_product_id)
        REFERENCES scrape_runs(id, tracked_product_id) ON DELETE RESTRICT,

    -- Idempotency: one attempt number per run
    CONSTRAINT uq_scrape_attempts_run_attempt
        UNIQUE (scrape_run_id, attempt_number),

    -- Composite unique: enables relational FK from price_history
    CONSTRAINT uq_scrape_attempts_id_product
        UNIQUE (id, tracked_product_id)
);

CREATE INDEX idx_scrape_attempts_run_id ON scrape_attempts(scrape_run_id);

-- ============================================================
-- 5. PRICE HISTORY (Immutable audit trail of verified prices)
-- ============================================================
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracked_product_id UUID NOT NULL
        REFERENCES tracked_products(id) ON DELETE CASCADE,
    scrape_attempt_id UUID NOT NULL,

    -- Verified data only (enforced by trigger + check constraints)
    price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
    mrp NUMERIC(12, 2) NULL CHECK (mrp IS NULL OR mrp >= price),
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    stock INT NOT NULL CHECK (stock >= 0),
    stock_status VARCHAR(32) NOT NULL
        CHECK (stock_status IN ('in_stock', 'out_of_stock')),

    seller VARCHAR(255) NULL,
    discount_pct INT NULL,
    rating NUMERIC(3, 2) NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 1:1 idempotency: one price_history row per scrape attempt max
    CONSTRAINT uq_price_history_attempt UNIQUE (scrape_attempt_id),

    -- Composite FK: price_history.tracked_product_id must match attempt's
    CONSTRAINT fk_price_history_attempt_product
        FOREIGN KEY (scrape_attempt_id, tracked_product_id)
        REFERENCES scrape_attempts(id, tracked_product_id) ON DELETE RESTRICT
);

CREATE INDEX idx_price_history_product_time
    ON price_history(tracked_product_id, recorded_at DESC);

-- ============================================================
-- 6. ALERTS
-- ============================================================
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracked_product_id UUID NOT NULL
        REFERENCES tracked_products(id) ON DELETE CASCADE,
    price_history_id UUID NULL
        REFERENCES price_history(id) ON DELETE SET NULL,
    alert_type VARCHAR(64) NOT NULL
        CHECK (alert_type IN ('price_drop', 'out_of_stock', 'back_in_stock', 'failure_streak')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    payload JSONB NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_unread ON alerts(is_read, created_at DESC);
