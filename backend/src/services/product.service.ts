/**
 * product.service.ts
 *
 * Responsible for searching the demo store and returning product metadata.
 * In Phase 2, we fetch the store's HTML and parse enough metadata to allow
 * a user to track a product. Actual price/stock scraping is Phase 3.
 */

export interface StoreProduct {
  store_product_id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
  target_url: string;
}

const STORE_BASE_URL = 'https://demo.inelabteamdev.com';

const MAX_SEARCH_REQUESTS = 15;
const SEARCH_PAGE_SIZE = 60;
const SEARCH_REQUEST_DELAY_MS = 200;
const MAX_SEARCH_RESULTS = 20;

function normalize(text: string) {
  return (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Search the store for products matching the query.
 * Due to the upstream API's randomized nature and lack of deterministic text search,
 * this function implements a hybrid approach:
 * 1. Direct ID/SKU lookups (Priority 4)
 * 2. Bounded polling over the randomized catalog for text searches.
 * Note: Because the text search relies on a bounded randomized source, it cannot
 * mathematically guarantee discovery of every matching product on every attempt.
 */
export async function searchStoreProducts(query: string): Promise<StoreProduct[]> {
  const normQuery = normalize(query);
  if (!normQuery) return [];

  // A. NUMERIC PRODUCT ID
  if (/^\d+$/.test(normQuery)) {
    const item = await resolveProductMetadata(normQuery);
    if (item && item.store_product_id === normQuery) return [item];
    return [];
  }

  // B. SKU LOOKUP
  const skuMatch = normQuery.match(/^[a-z]+-10(\d{3})$/);
  if (skuMatch) {
    const extractedId = skuMatch[1];
    const item = await resolveProductMetadata(extractedId);
    if (item && normalize(item.sku) === normQuery) return [item];
    // If SKU mapping is invalid, fall through to text search.
  }

  // C. TEXT SEARCH (Bounded Polling)
  const results = new Map<string, StoreProduct & { _matchType: number }>();
  let earlyExit = false;

  for (let page = 1; page <= MAX_SEARCH_REQUESTS; page++) {
    let jsonResponse: any;
    try {
      const url = `${STORE_BASE_URL}/api/catalog?page=${page}&pageSize=${SEARCH_PAGE_SIZE}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'INEPriceTracker/1.0', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });

      if (res.status === 503) {
        break; // Rate limit hit. Stop gracefully.
      }
      if (!res.ok) {
        break;
      }
      jsonResponse = await res.json();
    } catch (err) {
      break;
    }

    const items = jsonResponse?.items || [];
    
    // D. FILTER AFTER FETCH
    for (const item of items) {
      const strId = String(item.id);
      if (!item.id || results.has(strId)) continue;

      const normName = normalize(item.name);
      const normBrand = normalize(item.brand);
      const normCat = normalize(item.category);
      const normSku = normalize(item.sku);

      let isMatch = false;
      let matchType = 99;

      // E. EXACT MATCH PRIORITY
      if (strId === normQuery) { isMatch = true; matchType = 1; }
      else if (normSku === normQuery) { isMatch = true; matchType = 2; }
      else if (normName === normQuery) { isMatch = true; matchType = 3; }
      else if (normName.includes(normQuery)) { isMatch = true; matchType = 4; }
      else if (normBrand && normBrand.includes(normQuery)) { isMatch = true; matchType = 5; }
      else if (normCat && normCat.includes(normQuery)) { isMatch = true; matchType = 6; }

      if (isMatch) {
        results.set(strId, {
          store_product_id: strId,
          slug: item.slug || `product-${strId}`,
          name: item.name || `Product ${strId}`,
          brand: item.brand || 'Unknown',
          category: item.category || 'General',
          sku: item.sku || `SKU-${strId}`,
          target_url: `${STORE_BASE_URL}/product/${strId}`,
          _matchType: matchType
        });

        // Stop early if we find a strong/exact match
        if (matchType <= 3) {
          earlyExit = true;
          break;
        }
      }
    }

    if (earlyExit) break;
    // Stop early if we have enough partial matches
    if (results.size >= MAX_SEARCH_RESULTS) break;

    // Rate limit protection
    if (page < MAX_SEARCH_REQUESTS) {
      await new Promise(resolve => setTimeout(resolve, SEARCH_REQUEST_DELAY_MS));
    }
  }

  // F. NO-MATCH BEHAVIOR is implicitly handled (returns empty array if results is empty)
  // G. STABILITY / DEDUPLICATION is handled by the Map

  // Sort and extract final results
  const sorted = Array.from(results.values()).sort((a, b) => a._matchType - b._matchType);
  const finalResults = sorted.slice(0, MAX_SEARCH_RESULTS).map((item) => {
    const { _matchType, ...cleanItem } = item;
    return cleanItem;
  });

  return finalResults;
}

/**
 * Resolve metadata for a specific product by ID.
 */
export async function resolveProductMetadata(
  storeProductId: string
): Promise<StoreProduct | null> {
  // Use the underlying JSON API
  const url = `${STORE_BASE_URL}/api/product/${storeProductId}`;

  let item: any;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'INEPriceTracker/1.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Store responded with ${res.status}`);
    item = await res.json();

    // Ensure it didn't return an error JSON object
    if (item.error) return null;
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) return null;
    throw new Error(
      `Failed to reach the demo store API: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return {
    store_product_id: String(item.id),
    slug: item.slug || `product-${item.id}`,
    name: item.name || `Product ${item.id}`,
    brand: item.brand || 'Unknown',
    category: item.category || 'General',
    sku: item.sku || `SKU-${item.id}`,
    target_url: `${STORE_BASE_URL}/product/${item.id}`,
  };
}
