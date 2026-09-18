import asyncio
import json
import time
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

async def reveal_product(page, product_id):
    url = f"https://demo.inelabteamdev.com/product/{product_id}"
    print(f"\nTesting Product {product_id} at {url}...")
    await page.goto(url, wait_until="networkidle")
    await asyncio.sleep(0.5)
    
    price_block = page.locator(".price-block")
    reveal_btn = page.locator("button[aria-label='Reveal price']")
    
    # 1. Periodically check and remove cookie overlay if it pops up
    async def clear_cookie_overlay():
        try:
            await page.evaluate('''() => {
                const overlay = document.querySelector('.cookie-overlay');
                if (overlay) overlay.remove();
                document.body.style.overflow = 'auto';
            }''')
        except:
            pass

    await clear_cookie_overlay()
    
    box = await price_block.bounding_box()
    start_x = box["x"] + 25
    start_y = box["y"] + 25
    
    # Move mouse
    await page.mouse.move(start_x, start_y)
    for i in range(16):
        await page.mouse.move(start_x + (i * 12), start_y + ((i % 4) * 8))
        await asyncio.sleep(0.06)
        
    await asyncio.sleep(0.8)
    await clear_cookie_overlay()
    
    # Check button disabled
    if await reveal_btn.get_attribute("disabled") is not None:
        print("  Moving more to fulfill requirement...")
        for i in range(10):
            await page.mouse.move(start_x + 50 + (i * 5), start_y + 10)
            await asyncio.sleep(0.08)
        await asyncio.sleep(0.7)
        await clear_cookie_overlay()
        
    print("  Clicking Reveal price...")
    await clear_cookie_overlay()
    
    # Click with dispatch or normal click
    await reveal_btn.click()
    
    # Wait for success
    await page.locator(".price-success, .price-error").wait_for(timeout=15000)
    await asyncio.sleep(0.5)
    
    classes = await price_block.get_attribute("class")
    print(f"  Classes: {classes}")
    
    stock_el = page.locator(".stock-badge")
    stock_text = await stock_el.text_content() if await stock_el.count() > 0 else "N/A"
    
    text = await price_block.inner_text()
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    print(f"  Stock: '{stock_text}'")
    print(f"  DOM lines: {lines[:6]}")
    return {
        "productId": product_id,
        "classes": classes,
        "stock": stock_text,
        "lines": lines
    }

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        # Test 12
        r1 = await reveal_product(page, 12)
        print("-> Result 12:", r1)
        
        # Test 48
        r2 = await reveal_product(page, 48)
        print("-> Result 48:", r2)
        
        # Test 675
        r3 = await reveal_product(page, 675)
        print("-> Result 675:", r3)
        
        # Reload 12 again
        r4 = await reveal_product(page, 12)
        print("-> Result 12 (Reload):", r4)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
