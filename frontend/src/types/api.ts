export interface TrackedProduct {
  id: string;
  store_product_id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
  target_url: string;
  is_active: boolean;
  last_known_price: string | null;
  last_known_mrp: string | null;
  last_known_stock: number | null;
  last_known_stock_status: 'in_stock' | 'out_of_stock' | null;
  last_scraped_at: string | null;
  last_scrape_status: 'pending' | 'success' | 'failed';
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: string;
  tracked_product_id: string;
  scrape_attempt_id: string;
  price: string;
  mrp: string | null;
  currency: string;
  stock: number;
  stock_status: 'in_stock' | 'out_of_stock';
  seller: string | null;
  discount_pct: number | null;
  rating: number | null;
  recorded_at: string;
}

export interface ScrapeAttempt {
  id: string;
  scrape_run_id: string;
  tracked_product_id: string;
  attempt_number: number;
  status: 'success' | 'failed';
  duration_ms: number;
  failure_stage: string | null;
  error_type: string | null;
  error_message: string | null;
  raw_price_text: string | null;
  raw_stock_text: string | null;
  scraped_at: string;
}

export interface ScraperStatus {
  trackedProductCount: number;
  activeScrapeCount: number;
  successfulScrapes24h: number;
  failedScrapes24h: number;
  recentFailureRatePct: number;
  lastRunTimestamp: string | null;
}

export interface Alert {
  id: string;
  tracked_product_id: string;
  price_history_id: string | null;
  alert_type: 'price_drop' | 'out_of_stock' | 'back_in_stock' | 'failure_streak';
  title: string;
  message: string;
  payload: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
  product_name: string;
  product_brand: string;
  store_product_id: string;
}

// Standard API Response Wrappers
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
}
