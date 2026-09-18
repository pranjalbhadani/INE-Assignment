import { describe, it, expect, vi } from 'vitest';
import { extractProductData } from '../../src/scraper/parser/domParser';
import { sanitizePriceText, parseStockText } from '../../src/scraper/parser/sanitizers';
import { PermanentError } from '../../src/scraper/validator/errors';

describe('Scraper Unit Tests: Sanitizers', () => {
  it('correctly parses valid price with currency symbols and commas', () => {
    expect(sanitizePriceText('₹1,30,032')).toBe(130032);
    expect(sanitizePriceText('$99.99')).toBe(99.99);
  });

  it('correctly removes zero-width spaces and extracts digits', () => {
    const zeroWidthString = '₹1,\u200B30,\u200D032\uFEFF';
    expect(sanitizePriceText(zeroWidthString)).toBe(130032);
  });

  it('rejects missing or empty strings', () => {
    expect(sanitizePriceText('')).toBe(null);
  });

  it('rejects text without digits', () => {
    expect(sanitizePriceText('Free')).toBe(null);
  });

  it('correctly parses fullwidth digits', () => {
    expect(sanitizePriceText('₹１２３４')).toBe(1234);
  });

  it('parseStockText handles out of stock text', () => {
    expect(parseStockText('Out of stock', false)).toEqual({ stock: 0, stock_status: 'out_of_stock' });
    expect(parseStockText('Any text without in-stock class', false)).toEqual({ stock: 0, stock_status: 'out_of_stock' });
  });

  it('parseStockText extracts numbers from in stock text', () => {
    expect(parseStockText('102 in stock', true)).toEqual({ stock: 102, stock_status: 'in_stock' });
    expect(parseStockText('Selling fast — 88 left', true)).toEqual({ stock: 88, stock_status: 'in_stock' });
  });

  it('parseStockText returns null for missing numbers in stock text', () => {
    expect(parseStockText('In stock', true)).toBe(null);
  });
});

describe('Scraper Unit Tests: DOM Parser', () => {
  // Mock Playwright Page object
  const createMockPage = (
    skuText: string | null,
    brandText: string | null,
    hasSuccessContainer: boolean = true,
    priceHtml: string | null = null,
    stockClassList: string = 'stock-badge in-stock',
    stockText: string = '10 in stock',
    hasStockBadge: boolean = true
  ) => {
    return {
      locator: (selector: string) => {
        if (selector === '.sku-tag') return { innerText: vi.fn().mockResolvedValue(skuText) };
        if (selector === '.brand-tag') return { innerText: vi.fn().mockResolvedValue(brandText) };
        if (selector === '.price-success') return { count: vi.fn().mockResolvedValue(hasSuccessContainer ? 1 : 0) };
        if (selector === '.stock-badge:visible') {
          return {
            count: vi.fn().mockResolvedValue(hasStockBadge ? 1 : 0),
            first: () => ({
              getAttribute: vi.fn().mockResolvedValue(stockClassList),
              innerText: vi.fn().mockResolvedValue(stockText)
            })
          }
        }
        return { count: vi.fn().mockResolvedValue(0) };
      },
      evaluate: vi.fn().mockImplementation(async (evalFn) => {
        if (!priceHtml) return null;
        
        // Simulating the DOM parsing in browser context manually
        const jsdom = require('jsdom');
        const { JSDOM } = jsdom;
        const dom = new JSDOM(`<div class="price-success">${priceHtml}</div>`);
        const document = dom.window.document;
        
        // Emulate evaluate fn logic
        const container = document.querySelector('.price-success');
        if (!container) return null;
        const priceEl = container.querySelector('[class*="pv-"]');
        if (!priceEl) return null;
        priceEl.querySelectorAll('[aria-hidden="true"]').forEach((el: any) => el.remove());
        priceEl.querySelectorAll('[data-price="true"]').forEach((el: any) => el.remove());
        priceEl.querySelectorAll('[class*="mr-"], [class*="mrp"]').forEach((el: any) => el.remove());
        return priceEl.textContent; // jsdom textContent works similar to innerText for this simple test
      })
    } as any;
  };

  it('extracts valid product data', async () => {
    const page = createMockPage(
      'SKU: 12345', 
      'SuperBrand', 
      true, 
      '<div class="pv-123">₹1,500</div>'
    );
    
    const result = await extractProductData(page);
    expect(result).toEqual({
      sku: '12345',
      brand: 'SuperBrand',
      price: 1500,
      stock: 10,
      stock_status: 'in_stock'
    });
  });

  it('rejects honeypot values and concatenated discounts', async () => {
    // This is a regression test for the 14410830 concatenated bug
    const html = `
      <div class="pv-abc">
        <span class="mrp">₹14,410</span>
        <span aria-hidden="true">8</span>
        <span data-price="true">30</span>
        <span>₹1,30,032</span>
      </div>
    `;
    const page = createMockPage('SKU: 123', 'Brand', true, html);
    const result = await extractProductData(page);
    
    // MRP (14410), aria-hidden (8), data-price (30) are removed.
    // The only remaining text is ₹1,30,032
    expect(result.price).toBe(130032);
  });

  it('throws PermanentError if .price-success is missing', async () => {
    const page = createMockPage(null, null, false);
    await expect(extractProductData(page)).rejects.toThrow(PermanentError);
  });

  it('throws PermanentError if real price element cannot be found', async () => {
    const page = createMockPage(null, null, true, '<div>No pv- class</div>');
    await expect(extractProductData(page)).rejects.toThrow(PermanentError);
  });

  it('throws PermanentError if stock badge is missing', async () => {
    const page = createMockPage(null, null, true, '<div class="pv-123">₹100</div>', '', '', false);
    await expect(extractProductData(page)).rejects.toThrow(PermanentError);
  });
});
