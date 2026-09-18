import asyncio
import json
from playwright.async_api import async_playwright

import sys
sys.stdout.reconfigure(encoding='utf-8')

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        print("=== Network Responses ===")
        async def log_response(response):
            if "demo.inelabteamdev.com" in response.url or response.request.resource_type in ["fetch", "xhr"]:
                print(f"<< {response.status} {response.url} ({response.request.resource_type})")
                if "api" in response.url.lower() or "json" in response.url.lower():
                    try:
                        text = await response.text()
                        print(f"API Data snippet: {text[:200]}")
                    except Exception as e:
                        print("Could not read API data:", e)
                        
        page.on("response", log_response)
        
        print("\n=== Navigating ===")
        await page.goto("https://demo.inelabteamdev.com/", wait_until="networkidle")
        
        print("\n=== Checking DOM for Products ===")
        # Look for typical product containers
        products = await page.locator("article, .product, [class*='product-card'], [class*='item']").all()
        print(f"Found {len(products)} potential product elements.")
        
        if len(products) > 0:
            for i, prod in enumerate(products[:2]):
                html = await prod.inner_html()
                print(f"--- Product {i} HTML ---")
                print(html.strip()[:600])
                print("------------------------")
                
        # Save full HTML
        html = await page.content()
        with open("initial.html", "w", encoding="utf-8") as f:
            f.write(html)
            
        print("\n=== Checking Search ===")
        search_input = await page.query_selector("input")
        if search_input:
            print("Found an input field, filling 'laptop'...")
            await search_input.fill("laptop")
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(3000)
        else:
            print("No input field found for search.")
            
        print("\n=== Reloading to see if content is missing/delayed/errors ===")
        for i in range(3):
            print(f"Reload {i+1}...")
            await page.reload(wait_until="networkidle")
            await page.wait_for_timeout(1000)

            html_reload = await page.content()
            with open(f"reload_{i}.html", "w", encoding="utf-8") as f:
                f.write(html_reload)
                
            prods = await page.locator("article, .product, [class*='product-card'], [class*='item']").all()
            print(f"Found {len(prods)} products on reload {i+1}.")
            
        await browser.close()

asyncio.run(main())
