import asyncio
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        print("=== Network Responses ===")
        async def log_response(response):
            if response.request.resource_type in ["fetch", "xhr", "script", "document"]:
                print(f"<< {response.status} {response.url} ({response.request.resource_type})")
                if "api" in response.url.lower() or "price" in response.url.lower() or "stock" in response.url.lower():
                    try:
                        text = await response.text()
                        print(f"API Data ({response.url}): {text[:300]}...")
                    except:
                        pass
                        
        page.on("response", log_response)
        
        print("\n=== Navigating ===")
        await page.goto("https://demo.inelabteamdev.com/", wait_until="networkidle")
        
        print("\n=== Clicking First Product ===")
        buttons = await page.locator(".tile-cta").all()
        if buttons:
            await buttons[0].click()
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(2000)
            
            print(f"\nNavigated to: {page.url}")
            
            html = await page.content()
            with open("product.html", "w", encoding="utf-8") as f:
                f.write(html)
                
            price = await page.query_selector(".price, [class*='price']")
            stock = await page.query_selector(".stock, [class*='stock'], .inventory, [class*='availability']")
            
            if price:
                print(f"Price HTML: {await price.inner_html()}")
            if stock:
                print(f"Stock HTML: {await stock.inner_html()}")
                
            print("\n=== Revealing Price ===")
            price_area = await page.query_selector("div:has-text('Price hidden')")
            if price_area:
                print("Hovering over price area...")
                await price_area.hover()
                # wait to see if network requests happen
                await page.wait_for_timeout(5000)
            
            html = await page.content()
            with open("product_revealed.html", "w", encoding="utf-8") as f:
                f.write(html)
                
            price = await page.query_selector(".price, [class*='price-value'], [class*='pv-']")
            stock = await page.query_selector(".stock, [class*='stock'], [class*='st-']")
            
            if price:
                print(f"Revealed Price Text: {await price.inner_text()}")
                print(f"Revealed Price HTML: {await price.inner_html()}")
            if stock:
                print(f"Revealed Stock Text: {await stock.inner_text()}")
                print(f"Revealed Stock HTML: {await stock.inner_html()}")
                
        else:
            print("No product buttons found.")
            
        await browser.close()

asyncio.run(main())
