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

/**
 * Search the store for products matching the query.
 * The demo store uses React rendered HTML; we fetch and parse static metadata.
 * Price/stock are intentionally excluded here — those require the full Playwright
 * scraper (Phase 3).
 */
export async function searchStoreProducts(query: string): Promise<StoreProduct[]> {
  if (!query.trim()) return [];

  const url = `${STORE_BASE_URL}/search?q=${encodeURIComponent(query)}`;

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'INEPriceTracker/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Store responded with ${res.status}`);
    html = await res.text();
  } catch (err) {
    throw new Error(
      `Failed to reach the demo store: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return parseSearchResults(html, query);
}

/**
 * Resolve metadata for a specific product by ID.
 */
export async function resolveProductMetadata(
  storeProductId: string
): Promise<StoreProduct | null> {
  const url = `${STORE_BASE_URL}/product/${storeProductId}`;

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'INEPriceTracker/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Store responded with ${res.status}`);
    html = await res.text();
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) return null;
    throw new Error(
      `Failed to reach the demo store: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return parseProductPage(html, storeProductId, url);
}

// ── Internal Parsers ─────────────────────────────────────────────────────────
// Parse minimal product metadata from the store HTML.
// We only need fields that are available without browser JavaScript execution.

function parseSearchResults(html: string, _query: string): StoreProduct[] {
  const results: StoreProduct[] = [];

  // Match product card links: /product/<id>
  const linkPattern = /href="\/product\/(\d+)"/g;
  const seenIds = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(html)) !== null) {
    const id = match[1];
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    // Extract product name from nearby h2/h3 or data-name attribute
    const meta = extractProductMeta(html, id);
    if (meta) results.push(meta);
    if (results.length >= 20) break; // Safety cap
  }

  return results;
}

function parseProductPage(
  html: string,
  storeProductId: string,
  url: string
): StoreProduct | null {
  return extractProductMeta(html, storeProductId, url);
}

function extractProductMeta(
  html: string,
  id: string,
  url?: string
): StoreProduct | null {
  // Extract name from <title> or og:title
  const titleMatch =
    html.match(/<meta property="og:title" content="([^"]+)"/) ??
    html.match(/<title>([^<]+)<\/title>/);
  const name = titleMatch ? decodeHtml(titleMatch[1].replace(/ - INE Store$/i, '').trim()) : `Product ${id}`;

  // Extract brand from meta or data attributes
  const brandMatch =
    html.match(/data-brand="([^"]+)"/) ??
    html.match(/"brand"\s*:\s*"([^"]+)"/) ??
    html.match(/Brand[:\s]+([A-Za-z0-9\s]+)/);
  const brand = brandMatch ? decodeHtml(brandMatch[1].trim()) : 'Unknown';

  // Extract SKU
  const skuMatch =
    html.match(/data-sku="([^"]+)"/) ??
    html.match(/"sku"\s*:\s*"([^"]+)"/) ??
    html.match(/SKU[:\s]+([A-Za-z0-9-]+)/);
  const sku = skuMatch ? skuMatch[1].trim() : `SKU-${id}`;

  // Extract category
  const catMatch =
    html.match(/data-category="([^"]+)"/) ??
    html.match(/"category"\s*:\s*"([^"]+)"/);
  const category = catMatch ? decodeHtml(catMatch[1].trim()) : 'General';

  const slug = `product-${id}`;
  const targetUrl = url ?? `https://demo.inelabteamdev.com/product/${id}`;

  return {
    store_product_id: id,
    slug,
    name,
    brand,
    category,
    sku,
    target_url: targetUrl,
  };
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
