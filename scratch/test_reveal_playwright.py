import asyncio
import json
import time
from playwright.async_api import async_playwright

async def test_product(product_id):
    print(f"\n========================================================")
    print(f"TESTING PRODUCT {product_id}")
    print(f"========================================================")
    
    async with async_playwright() as p:
        # Launch headed browser so we can see and test real interactions
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        network_logs = []
        
        page.on("request", lambda req: network_logs.append({
            "type": "REQUEST",
            "url": req.url,
            "method": req.method,
            "headers": dict(req.headers),
            "post_data": req.post_data
        }))
        
        async def on_response(res):
            try:
                body = None
                if "api" in res.url:
                    try:
                        body = await res.json()
                    except:
                        body = await res.text()
                network_logs.append({
                    "type": "RESPONSE",
                    "url": res.url,
                    "status": res.status,
                    "body": body
                })
            except Exception as e:
                pass

        page.on("response", on_response)
        
        url = f"https://demo.inelabteamdev.com/product/{product_id}"
        print(f"Navigating to {url}...")
        await page.goto(url, wait_until="networkidle")
        
        # Check initial DOM state
        price_block = page.locator(".price-block")
        reveal_btn = page.locator("button[aria-label='Reveal price']")
        
        print("Initial state:")
        print("Price status text:", await page.locator(".price-status").text_content())
        print("Price substatus text:", await page.locator(".price-substatus").text_content())
        print("Reveal button disabled attribute:", await reveal_btn.get_attribute("disabled"))
        
        # Take screenshot of initial state
        await page.screenshot(path=f"scratch/product_{product_id}_initial.png")
        
        # Get bounding box of price block
        box = await price_block.bounding_box()
        print(f"Price block box: {box}")
        
        # Move mouse over price block repeatedly to satisfy minMoves (>=8) and minDwellMs (>=600ms)
        print("Simulating mouse moves and dwell time over price block...")
        start_x = box["x"] + 10
        start_y = box["y"] + 10
        
        for i in range(15):
            await page.mouse.move(start_x + (i * 10), start_y + ((i % 3) * 5))
            await asyncio.sleep(0.08)
            
        await asyncio.sleep(0.7) # dwell time > 600ms
        
        # Check substatus and button disabled status after hover/dwell
        print("\nAfter hover + dwell:")
        print("Price substatus text:", await page.locator(".price-substatus").text_content())
        is_disabled = await reveal_btn.get_attribute("disabled")
        print("Reveal button disabled attribute:", is_disabled)
        
        # If enabled (disabled is None), click it!
        if is_disabled is None:
            print("Button is ENABLED! Clicking 'Reveal price'...")
            # Capture network requests specifically around click
            click_start_time = time.time()
            await reveal_btn.click()
            
            # Wait for price to reveal (either price-success or price-error or price-status change)
            print("Waiting for price block state change...")
            try:
                await page.wait_for_selector(".price-success, .price-error", timeout=10000)
            except Exception as e:
                print("Wait timed out:", e)
                
            await asyncio.sleep(1)
            
            # Check final DOM state
            print("\nFinal State after click:")
            price_block_classes = await price_block.get_attribute("class")
            print("Price block class:", price_block_classes)
            
            # Check for revealed elements
            main_text = await page.locator(".price-block").inner_text()
            print(f"Price block full text:\n{main_text}")
            
            await page.screenshot(path=f"scratch/product_{product_id}_revealed.png")
            
            # Check specific elements
            stock_badge = page.locator(".stock-badge")
            if await stock_badge.count() > 0:
                print("Stock badge found! Text:", await stock_badge.text_content(), "Class:", await stock_badge.get_attribute("class"))
            else:
                print("Stock badge NOT found in DOM")
                
            amount_el = page.locator("[data-price='true']")
            if await amount_el.count() > 0:
                print("data-price element found! Text:", await amount_el.text_content())
                
            visible_price = page.locator(".price-main")
            if await visible_price.count() > 0:
                print("Price main text:", await visible_price.text_content())
                
        else:
            print("Button is STILL disabled! Moving more...")
            for i in range(25):
                await page.mouse.move(start_x + (i * 5), start_y + ((i % 4) * 8))
                await asyncio.sleep(0.05)
            await asyncio.sleep(0.8)
            print("Substatus now:", await page.locator(".price-substatus").text_content())
            print("Button disabled now:", await reveal_btn.get_attribute("disabled"))
            
        # Save network logs to file
        with open(f"scratch/network_{product_id}.json", "w", encoding="utf-8") as f:
            json.dump(network_logs, f, indent=2, default=str)
            
        print(f"Network logs saved to scratch/network_{product_id}.json")
        await browser.close()

async def main():
    await test_product(48)
    await test_product(675)

if __name__ == "__main__":
    asyncio.run(main())
