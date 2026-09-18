import {
  ApiResponse,
  TrackedProduct,
  PriceHistory,
  ScrapeAttempt,
  ScraperStatus,
  Alert
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  // Scraper Status
  getScraperStatus: () => fetchApi<ScraperStatus>('/scraper/status'),

  // Alerts
  getAlerts: () => fetchApi<Alert[]>('/alerts'),

  // Products
  getTrackedProducts: () => fetchApi<TrackedProduct[]>('/tracked-products'),
  getTrackedProduct: (id: string) => fetchApi<TrackedProduct>(`/tracked-products/${id}`),
  searchProducts: (query: string) => fetchApi<any>(`/products/search?q=${encodeURIComponent(query)}`), // Using any for store products
  trackProduct: (storeProductId: string) => fetchApi<TrackedProduct>('/tracked-products', {
    method: 'POST',
    body: JSON.stringify({ store_product_id: storeProductId })
  }),
  untrackProduct: (id: string) => fetchApi<void>(`/tracked-products/${id}`, { method: 'DELETE' }),

  // History & Scrapes
  getPriceHistory: (id: string) => fetchApi<PriceHistory[]>(`/tracked-products/${id}/history`),
  getScrapeHistory: (id: string) => fetchApi<ScrapeAttempt[]>(`/tracked-products/${id}/scrapes`),

  // Manual Scrape Action
  runScrape: (id: string) => fetchApi<ScrapeAttempt>(`/tracked-products/${id}/scrape`, { method: 'POST' }),

  // System Health
  getHealth: () => fetchApi<any>('/health')
};
