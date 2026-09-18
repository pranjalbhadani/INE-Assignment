export function sanitizePriceText(rawText: string): number | null {
  if (!rawText) return null;
  
  // Convert fullwidth digits to halfwidth
  let clean = rawText.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
  
  // 1. Remove all variations of zero-width spaces
  clean = clean.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // 2. Remove commas, currency symbols (₹, $), spaces, and any other non-digit characters
  // We want to extract ONLY the digits and decimal points (if any)
  clean = clean.replace(/[^\d.]/g, '');
  
  // 3. Parse float
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return null;
  return parsed;
}

export function parseStockText(rawText: string, hasInStockClass: boolean): { stock: number; stock_status: 'in_stock' | 'out_of_stock' } | null {
  if (!rawText) return null;
  const clean = rawText.trim();
  
  if (clean.toLowerCase() === 'out of stock' || !hasInStockClass) {
    return { stock: 0, stock_status: 'out_of_stock' };
  }

  // Look for any numbers in the string (e.g. "102 in stock", "Selling fast — 88 left")
  const match = clean.match(/\d+/);
  if (match) {
    return { stock: parseInt(match[0]!, 10), stock_status: 'in_stock' };
  }

  // Fallback if no numeric stock is found but has "in-stock" class
  return null;
}
