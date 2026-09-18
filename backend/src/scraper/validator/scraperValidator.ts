import { PermanentError } from './errors';
import { TrackedProduct } from '../../repositories/trackedProduct.repo';

export interface ParsedPayload {
  price: number;
  stock: number;
  stock_status: 'in_stock' | 'out_of_stock';
  sku: string | null;
  brand: string | null;
  mrp?: number | null;
}

export function validateProductQuote(
  payload: ParsedPayload,
  trackedProduct: TrackedProduct
): void {
  // 1. Identity Check (SKU / Brand)
  // If SKU is extracted from page, it must match the database exactly.
  if (payload.sku && payload.sku !== trackedProduct.sku) {
    throw new PermanentError(
      'identity_mismatch',
      'permanent_identity_mismatch',
      `Product SKU mismatch. Expected: ${trackedProduct.sku}, Found: ${payload.sku}`
    );
  }

  // 2. Price Check (> 0)
  if (payload.price <= 0 || isNaN(payload.price)) {
    throw new PermanentError(
      'validation',
      'permanent_validation',
      `Invalid price. Extracted: ${payload.price}`
    );
  }

  // 3. Stock Check (>= 0)
  if (payload.stock < 0 || isNaN(payload.stock)) {
    throw new PermanentError(
      'validation',
      'permanent_validation',
      `Invalid stock. Extracted: ${payload.stock}`
    );
  }

  // 4. MRP Check (if present)
  if (payload.mrp != null && payload.mrp < payload.price) {
    // Some stores might have mrp < price in weird cases, but per design rules:
    // mrp NUMERIC(12, 2) NULL CHECK (mrp IS NULL OR mrp >= price)
    throw new PermanentError(
      'validation',
      'permanent_validation',
      `Invalid MRP. MRP (${payload.mrp}) cannot be less than price (${payload.price})`
    );
  }
}
