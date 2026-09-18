import asyncio
import json
import time
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

async def test_product(page, product_id):
    print(f"\n========================================================")
    print(f"TESTING PRODUCT {product_id}")
    print(f"========================================================")
    
    network_events = []
    
    def on_request(req):
        if "api" in req.url:
            network_events.append({
                "type": "REQ",
                "method": req.method,
                "url": req.url,
                "headers": dict(req.headers),
                "post_data": req.post_data
            })
            
    async def on_response(res):
        if "api" in res.url:
            try:
                body = await res.json()
            except:
                body = await res.text()
            network_events.append({
                "type": "RES",
                "status": res.status,
                "url": res.url,
                "body": body
            })

    page.on("request", on_request)
    page.on("response", on_response)

    url = f"https://demo.inelabteamdev.com/product/{product_id}"
    print(f"Navigating to {url}...")
    await page.goto(url, wait_until="networkidle")
    await asyncio.sleep(1)

    # 1. Initial State
    price_block = page.locator(".price-block")
    reveal_btn = page.locator("button[aria-label='Reveal price']")
    
    substatus_initial = await page.locator(".price-substatus").text_content()
    btn_disabled_initial = await reveal_btn.get_attribute("disabled")
    print(f"[Initial] Substatus: '{substatus_initial}', Button disabled: {btn_disabled_initial}")
    
    # 2. Hover and move mouse over price block to satisfy minMoves (>=8) and minDwellMs (>=600ms)
    box = await price_block.bounding_box()
    start_x = box["x"] + 20
    start_y = box["y"] + 20
    
    # Initial mouse move into block
    await page.mouse.move(start_x, start_y)
    await asyncio.sleep(0.1)
    
    for i in range(15):
        await page.mouse.move(start_x + (i * 15), start_y + ((i % 4) * 8))
        await asyncio.sleep(0.06)
        
    await asyncio.sleep(0.8) # Dwell > 600ms
    
    substatus_after = await page.locator(".price-substatus").text_content()
    btn_disabled_after = await reveal_btn.get_attribute("disabled")
    print(f"[After Hover+Dwell] Substatus: '{substatus_after}', Button disabled: {btn_disabled_after}")
    
    # Wait until button is enabled
    if btn_disabled_after is not None:
        print("Waiting for button to enable...")
        for _ in range(10):
            await page.mouse.move(start_x + 30, start_y + 10)
            await asyncio.sleep(0.2)
            if await reveal_btn.get_attribute("disabled") is None:
                break
                
    btn_disabled_now = await reveal_btn.get_attribute("disabled")
    print(f"Button enabled status: {btn_disabled_now is None}")
    
    if btn_disabled_now is None:
        print("Clicking 'Reveal price'...")
        await reveal_btn.click()
        
        # Wait for either .price-success or .price-error
        try:
            await page.wait_for_selector(".price-success, .price-error", timeout=15000)
        except Exception as e:
            print("Wait for result selector timed out:", e)
            
        await asyncio.sleep(1)
        
        # Take screenshot of revealed state
        await page.screenshot(path=f"scratch/product_{product_id}_final.png")
        
        classes = await price_block.get_attribute("class")
        print(f"Final price block classes: {classes}")
        
        # Extract revealed content
        if "price-success" in (classes or ""):
            # Check price values
            full_text = await price_block.inner_text()
            print("--- REVEALED TEXT ---")
            print(full_text)
            print("---------------------")
            
            # Stock
            stock_el = page.locator(".stock-badge")
            stock_text = await stock_el.text_content() if await stock_el.count() > 0 else "None"
            stock_class = await stock_el.get_attribute("class") if await stock_el.count() > 0 else "None"
            print(f"Stock: '{stock_text}' (class: {stock_class})")
            
            # Amount
            amount_el = page.locator("[data-price='true']")
            amount_text = await amount_el.text_content() if await amount_el.count() > 0 else "None"
            print(f"Data-price element: '{amount_text}'")
            
            # Price main
            price_main = page.locator(".price-main")
            price_main_text = await price_main.text_content() if await price_main.count() > 0 else "None"
            print(f"Price main content: '{price_main_text}'")
            
            # HTML
            html = await price_block.inner_html()
            with open(f"scratch/product_{product_id}_price_block.html", "w", encoding="utf-8") as f:
                f.write(html)
        else:
            print(f"Product {product_id} did not transition to price-success. Status text: {await page.locator('.price-status').text_content()}")
            print(f"Substatus: {await page.locator('.price-substatus').text_content()}")

    # Save network events
    with open(f"scratch/api_events_{product_id}.json", "w", encoding="utf-8") as f:
        json.dump(network_events, f, indent=2, default=str)
        
    page.remove_listener("request", on_request)
    page.remove_listener("response", on_response)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        # Test 3 different products
        for pid in [48, 675, 12]:
            await test_product(page, pid)
            await asyncio.sleep(1)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
