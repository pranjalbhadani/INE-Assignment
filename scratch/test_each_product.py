import asyncio
import json
import time
import sys
from playwright.async_api import async_playwright

# Ensure standard output can print Unicode characters
sys.stdout.reconfigure(encoding='utf-8')

async def test_single_product(product_id):
    print(f"\n=================================================================")
    print(f"INVESTIGATING PRODUCT {product_id} (FRESH BROWSER CONTEXT)")
    print(f"=================================================================")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        network_logs = []
        
        page.on("request", lambda req: network_logs.append({
            "type": "REQ",
            "time": time.time(),
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
                    "type": "RES",
                    "time": time.time(),
                    "url": res.url,
                    "status": res.status,
                    "body": body
                })
            except:
                pass

        page.on("response", on_response)
        
        url = f"https://demo.inelabteamdev.com/product/{product_id}"
        print(f"1. Navigating to {url}...")
        await page.goto(url, wait_until="networkidle")
        await asyncio.sleep(0.5)
        
        # 1. Inspect initial DOM
        price_block = page.locator(".price-block")
        reveal_btn = page.locator("button[aria-label='Reveal price']")
        
        initial_status = await page.locator(".price-status").text_content()
        initial_substatus = await page.locator(".price-substatus").text_content()
        initial_disabled = await reveal_btn.get_attribute("disabled")
        print(f"   [Initial DOM] status='{initial_status}', substatus='{initial_substatus}', disabled='{initial_disabled}'")
        
        # 2. Hover and mouse movement
        box = await price_block.bounding_box()
        print(f"   [Price box coordinates] x={box['x']}, y={box['y']}, w={box['width']}, h={box['height']}")
        
        # Move into the center of the price block
        center_x = box["x"] + (box["width"] / 2)
        center_y = box["y"] + (box["height"] / 2)
        
        print(f"   Simulating mouse moves back and forth over price block...")
        await page.mouse.move(center_x, center_y)
        await asyncio.sleep(0.1)
        
        for i in range(12):
            offset_x = (i % 2 * 20) - 10
            offset_y = (i % 3 * 10) - 15
            await page.mouse.move(center_x + offset_x, center_y + offset_y)
            await asyncio.sleep(0.08)
            
        await asyncio.sleep(0.8) # Ensure dwell time > 600ms
        
        post_hover_substatus = await page.locator(".price-substatus").text_content()
        post_hover_disabled = await reveal_btn.get_attribute("disabled")
        print(f"   [Post-Hover DOM] substatus='{post_hover_substatus}', disabled='{post_hover_disabled}'")
        
        if post_hover_disabled is not None:
            print("   Button not yet enabled, performing additional deliberate movement...")
            for i in range(10):
                await page.mouse.move(center_x + (i * 5), center_y)
                await asyncio.sleep(0.1)
            await asyncio.sleep(0.7)
            post_hover_disabled = await reveal_btn.get_attribute("disabled")
            print(f"   [Retry-Hover DOM] disabled='{post_hover_disabled}'")

        if post_hover_disabled is None:
            print("2. Button is ENABLED! Clicking 'Reveal price'...")
            # Click the button
            await reveal_btn.click()
            
            print("3. Waiting for price resolution (price-success or price-error)...")
            try:
                await page.wait_for_selector(".price-success, .price-error", timeout=12000)
            except Exception as e:
                print("   Wait timeout reached:", e)
                
            await asyncio.sleep(1)
            
            final_classes = await price_block.get_attribute("class")
            print(f"4. [Final State] Price block classes: '{final_classes}'")
            
            # Print full inner text
            full_text = await price_block.inner_text()
            print("----------------- REVEALED DOM TEXT -----------------")
            print(full_text)
            print("-----------------------------------------------------")
            
            # Check price element
            amt = page.locator("[data-price='true']")
            if await amt.count() > 0:
                print(f"   [Found [data-price='true']] Text: '{await amt.text_content()}'")
            
            # Check stock badge
            stock = page.locator(".stock-badge")
            if await stock.count() > 0:
                print(f"   [Found .stock-badge] Text: '{await stock.text_content()}', Class: '{await stock.get_attribute('class')}'")
            else:
                print("   [.stock-badge not present]")
                
            # Screenshot
            await page.screenshot(path=f"scratch/product_{product_id}_success.png")
            print(f"   Screenshot saved to scratch/product_{product_id}_success.png")
            
            # HTML
            html = await price_block.inner_html()
            with open(f"scratch/product_{product_id}_block.html", "w", encoding="utf-8") as f:
                f.write(html)
        else:
            print("   FAILED to enable 'Reveal price' button.")
            
        # Inspect API network calls
        api_calls = [log for log in network_logs if "api" in log["url"]]
        print(f"\n5. Network API Calls Observed ({len(api_calls)} events):")
        for log in api_calls:
            if log["type"] == "REQ":
                print(f"   -> [REQ] {log['method']} {log['url']}")
                if log.get("headers", {}).get("authorization"):
                    print(f"            Authorization: {log['headers']['authorization'][:30]}...")
            elif log["type"] == "RES":
                print(f"   <- [RES] {log['status']} {log['url']}")
                if log.get("body"):
                    print(f"            Body: {str(log['body'])[:120]}")
                    
        with open(f"scratch/network_full_{product_id}.json", "w", encoding="utf-8") as f:
            json.dump(network_logs, f, indent=2, default=str)

        await browser.close()

async def main():
    for pid in [675, 48, 12]:
        await test_single_product(pid)

if __name__ == "__main__":
    asyncio.run(main())
