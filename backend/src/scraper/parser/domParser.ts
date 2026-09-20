import { Page, Locator } from 'playwright';
import { PermanentError } from '../validator/errors';
import { ParsedPayload } from '../validator/scraperValidator';
import { sanitizePriceText, parseStockText } from './sanitizers';

export async function extractProductData(page: Page): Promise<ParsedPayload> {
  const skuText = await page.locator('.sku-tag').innerText({ timeout: 1000 }).catch(() => null);
  const brandText = await page.locator('.brand-tag').innerText({ timeout: 1000 }).catch(() => null);

  const sku = skuText ? skuText.replace(/^SKU:\s*/i, '').trim() : null;
  const brand = brandText ? brandText.trim() : null;

  // 2. Locate the success container
  const successContainer = page.locator('.price-success');
  if (await successContainer.count() === 0) {
    throw new PermanentError('parsing', 'permanent_selector_missing', 'Cannot find .price-success container');
  }

  // 3. Extract the real visible price explicitly filtering out honeypots
  // Run directly in page context to avoid Playwright Locator hanging issues
  const validPriceText = await page.evaluate(() => {
    const container = document.querySelector('.price-success');
    if (!container) return null;
    
    // We must find the specific price value container to avoid concatenating discounts and other elements.
    // According to reconnaissance, the real price uses a dynamic layout class starting with "pv-" (e.g. .pv-k2)
    const priceEl = container.querySelector('[class*="pv-"]');
    if (!priceEl) return null;
    
    // We modify the live DOM temporarily because cloneNode doesn't compute styles for display:none
    priceEl.querySelectorAll('[aria-hidden="true"]').forEach((el: Element) => el.remove());
    priceEl.querySelectorAll('[data-price="true"]').forEach((el: Element) => el.remove());
    priceEl.querySelectorAll('[class*="mr-"], [class*="mrp"]').forEach((el: Element) => el.remove());
    
    return (priceEl as HTMLElement).innerText;
  }).catch(e => {
    throw new PermanentError('parsing', 'permanent_parse_error', `Failed to evaluate price DOM: ${e.message}`);
  });

  if (!validPriceText) {
    throw new PermanentError('parsing', 'permanent_parse_error', 'Unambiguous real price element could not be found');
  }
  
  const price = sanitizePriceText(validPriceText);
  if (price === null) {
    throw new PermanentError('parsing', 'permanent_parse_error', `Could not sanitize price text: ${validPriceText}`);
  }

  // 4. Extract Stock
  const stockBadge = page.locator('.stock-badge:visible');
  if (await stockBadge.count() === 0) {
    throw new PermanentError('parsing', 'permanent_selector_missing', 'Cannot find .stock-badge');
  }

  const classList = await stockBadge.first().getAttribute('class') || '';
  const stockText = await stockBadge.first().innerText();
  const hasInStock = classList.includes('in-stock');

  const stockInfo = parseStockText(stockText, hasInStock);
  if (!stockInfo) {
    throw new PermanentError('parsing', 'permanent_parse_error', `Could not parse stock text: ${stockText}`);
  }

  return {
    price,
    stock: stockInfo.stock,
    stock_status: stockInfo.stock_status,
    sku,
    brand
  };
}
