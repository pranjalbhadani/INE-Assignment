import asyncio
import json
import time
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

async def reveal_product(page, product_id):
    url = f"https://demo.inelabteamdev.com/product/{product_id}"
    await page.goto(url, wait_until="networkidle")
    await asyncio.sleep(0.5)
    
    # Dismiss cookie banner if visible
    cookie_btn = page.locator("button[aria-label='Accept cookies']")
    if await cookie_btn.count() > 0 and await cookie_btn.is_visible():
        await cookie_btn.click()
        await asyncio.sleep(0.2)
        
    price_block = page.locator(".price-block")
    reveal_btn = page.locator("button[aria-label='Reveal price']")
    
    box = await price_block.bounding_box()
    start_x = box["x"] + 20
    start_y = box["y"] + 20
    
    # Simulate smooth mouse hover & dwell
    await page.mouse.move(start_x, start_y)
    for i in range(15):
        await page.mouse.move(start_x + (i * 10), start_y + ((i % 3) * 5))
        await asyncio.sleep(0.06)
    await asyncio.sleep(0.7)
    
    # Check button disabled
    if await reveal_btn.get_attribute("disabled") is not None:
        await page.mouse.move(start_x + 50, start_y + 10)
        await asyncio.sleep(0.5)
        
    await reveal_btn.click()
    await page.locator(".price-success, .price-error").wait_for(timeout=15000)
    await asyncio.sleep(0.5)
    
    stock_el = page.locator(".stock-badge")
    stock_text = await stock_el.text_content() if await stock_el.count() > 0 else "N/A"
    
    # Get all text from price block
    text = await price_block.inner_text()
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    return {
        "productId": product_id,
        "stock": stock_text,
        "lines": lines
    }

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        # Test 12 twice
        print("Test 1 on Product 12:")
        r1 = await reveal_product(page, 12)
        print("Result 1:", r1)
        
        print("\nTest 2 on Product 12 (Fresh reload):")
        r2 = await reveal_product(page, 12)
        print("Result 2:", r2)
        
        print("\nTest 1 on Product 48:")
        r3 = await reveal_product(page, 48)
        print("Result 3:", r3)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
