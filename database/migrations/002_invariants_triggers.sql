-- ============================================================
-- Migration 002: Database-Level Invariant Trigger
-- Project: INE Price Tracker
-- ============================================================
-- Trigger: Enforce that price_history can ONLY be written if:
--   1. The referenced scrape_attempt exists.
--   2. The referenced scrape_attempt has status = 'success'.
--   3. The referenced scrape_attempt.tracked_product_id matches
--      price_history.tracked_product_id exactly.
-- This is a database-level backstop; the composite FK in migration 001
-- handles the identity alignment structurally, but this trigger provides
-- a readable error message and guards against any future schema drift.
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_price_history_success_invariant()
RETURNS TRIGGER AS $$
DECLARE
    v_status  VARCHAR(32);
    v_product UUID;
BEGIN
    SELECT status, tracked_product_id
    INTO   v_status, v_product
    FROM   scrape_attempts
    WHERE  id = NEW.scrape_attempt_id;

    -- Check 1: Attempt must exist
    IF v_status IS NULL THEN
        RAISE EXCEPTION
            'Invariant violation: scrape_attempt % does not exist',
            NEW.scrape_attempt_id;
    END IF;

    -- Check 2: Attempt must have succeeded
    IF v_status <> 'success' THEN
        RAISE EXCEPTION
            'Invariant violation: price_history may only be written after '
            'a successful scrape attempt. Attempt % has status "%"',
            NEW.scrape_attempt_id, v_status;
    END IF;

    -- Check 3: Product identity must match exactly
    IF v_product <> NEW.tracked_product_id THEN
        RAISE EXCEPTION
            'Invariant violation: product identity mismatch. '
            'price_history.tracked_product_id=% but '
            'scrape_attempt.tracked_product_id=%',
            NEW.tracked_product_id, v_product;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_price_history_invariant
BEFORE INSERT ON price_history
FOR EACH ROW
EXECUTE FUNCTION enforce_price_history_success_invariant();
