import { PermanentError, ScrapeError, TransientError } from './validator/errors';

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
};

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  deadlineMs: number, // Absolute timestamp when the entire scrape must abort
  policy: RetryPolicy = DEFAULT_POLICY
): Promise<T> {
  let attempt = 1;

  while (true) {
    // 1. Time Budget Check before even attempting
    if (Date.now() > deadlineMs) {
      throw new TransientError('timeout', 'transient_timeout', 'Scrape time budget exceeded (deadline passed)');
    }

    try {
      return await operation(attempt);
    } catch (err) {
      // If we've reached max attempts or it's a permanent error, abort retries
      if (err instanceof PermanentError) {
        throw err;
      }
      
      if (attempt >= policy.maxAttempts) {
        // Rethrow the last error, wrapped if needed
        if (err instanceof ScrapeError) throw err;
        throw new TransientError('timeout', 'transient_timeout', `Max retries exceeded: ${err}`);
      }

      // Check time budget before sleeping
      if (Date.now() > deadlineMs) {
        throw new TransientError('timeout', 'transient_timeout', 'Scrape time budget exceeded during retry evaluation');
      }

      // Calculate exponential backoff with full jitter
      // Delay = random(0, min(MaxDelay, BaseDelay * 2^(attempt-1)))
      const expBackoff = policy.baseDelayMs * Math.pow(2, attempt - 1);
      const maxBackoff = Math.min(policy.maxDelayMs, expBackoff);
      const jitterDelay = Math.random() * maxBackoff;
      
      // Ensure we don't sleep past the deadline
      const sleepTime = Math.min(jitterDelay, deadlineMs - Date.now());
      if (sleepTime > 0) {
        await new Promise(resolve => setTimeout(resolve, sleepTime));
      }

      attempt++;
    }
  }
}
