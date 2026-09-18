-- Seed: Sample tracked products for development/testing
-- These match known product IDs on demo.inelabteamdev.com

INSERT INTO tracked_products
    (store_product_id, slug, name, brand, category, sku, target_url)
VALUES
    ('12',  'product-12',  'Sample Product 12',  'BrandA', 'Electronics', 'SKU-012', 'https://demo.inelabteamdev.com/product/12'),
    ('48',  'product-48',  'Sample Product 48',  'BrandB', 'Electronics', 'SKU-048', 'https://demo.inelabteamdev.com/product/48'),
    ('675', 'product-675', 'Sample Product 675', 'BrandC', 'Electronics', 'SKU-675', 'https://demo.inelabteamdev.com/product/675')
ON CONFLICT (store_product_id) DO NOTHING;
