export type FailureStage =
  | 'navigation'
  | 'cookie_dismissal'
  | 'interaction_hover'
  | 'challenge_token'
  | 'price_fetch'
  | 'dom_render'
  | 'parsing'
  | 'validation'
  | 'identity_mismatch'
  | 'timeout';

export type ErrorType =
  | 'transient_timeout'
  | 'transient_network'
  | 'transient_5xx'
  | 'transient_rate_limit'
  | 'permanent_validation'
  | 'permanent_identity_mismatch'
  | 'permanent_selector_missing'
  | 'permanent_parse_error';

export class ScrapeError extends Error {
  constructor(
    public readonly stage: FailureStage,
    public readonly type: ErrorType,
    message: string
  ) {
    super(message);
    this.name = 'ScrapeError';
  }
}

export class TransientError extends ScrapeError {
  constructor(stage: FailureStage, type: ErrorType, message: string) {
    super(stage, type, message);
    this.name = 'TransientError';
  }
}

export class PermanentError extends ScrapeError {
  constructor(stage: FailureStage, type: ErrorType, message: string) {
    super(stage, type, message);
    this.name = 'PermanentError';
  }
}
