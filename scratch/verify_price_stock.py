import asyncio
import json
import time
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

async def reveal_product_price(page, product_id, run_index=1):
    print(f"\n========================================================")
    print(f"TESTING PRODUCT {product_id} (RUN {run_index})")
    print(f"========================================================")
    
    url = f"https://demo.inelabteamdev.com/product/{product_id}"
    print(f"1. Navigating to {url}...")
    await page.goto(url, wait_until="networkidle")
    await asyncio.sleep(0.5)
    
    # Check and dismiss cookie banner if present
    cookie_btn = page.locator("button[aria-label='Accept cookies']")
    if await cookie_btn.count() > 0 and await cookie_btn.is_visible():
        print("   Dismissing cookie consent banner...")
        await cookie_btn.click()
        await asyncio.sleep(0.5)

    price_block = page.locator(".price-block")
    reveal_btn = page.locator("button[aria-label='Reveal price']")
    
    # Move mouse into price block
    box = await price_block.bounding_box()
    start_x = box["x"] + 20
    start_y = box["y"] + 20
    
    print("2. Simulating human-like mouse movements over price block...")
    await page.mouse.move(start_x, start_y)
    await asyncio.sleep(0.05)
    
    # 15 distinct moves to exceed minMoves (8)
    for i in range(15):
        await page.mouse.move(start_x + (i * 12), start_y + ((i % 4) * 8))
        await asyncio.sleep(0.06)
        
    # Dwell > 600ms
    await asyncio.sleep(0.7)
    
    # Check if button is enabled
    is_disabled = await reveal_btn.get_attribute("disabled")
    print(f"   Button disabled attribute: {is_disabled}")
    
    if is_disabled is not None:
        print("   Button still disabled, moving mouse again...")
        for i in range(10):
            await page.mouse.move(start_x + 50 + (i * 5), start_y + 10)
            await asyncio.sleep(0.08)
        await asyncio.sleep(0.7)
        is_disabled = await reveal_btn.get_attribute("disabled")
        print(f"   Button disabled attribute after extra move: {is_disabled}")

    if is_disabled is None:
        print("3. Button enabled! Clicking 'Reveal price'...")
        await reveal_btn.click()
        
        # Wait for price-success or price-error
        try:
            res_locator = page.locator(".price-success, .price-error")
            await res_locator.wait_for(timeout=12000)
        except Exception as e:
            print("   Timeout waiting for price-success/price-error:", e)
            
        await asyncio.sleep(1)
        
        classes = await price_block.get_attribute("class")
        print(f"4. Result classes: '{classes}'")
        
        if "price-success" in (classes or ""):
            full_text = await price_block.inner_text()
            print("--- REVEALED DOM TEXT ---")
            print(full_text)
            print("-------------------------")
            
            # Stock element
            stock_el = page.locator(".stock-badge")
            stock_text = await stock_el.text_content() if await stock_el.count() > 0 else "None"
            stock_class = await stock_el.get_attribute("class") if await stock_el.count() > 0 else "None"
            
            # Real price: visible formatted text
            # Extract real visible price from the dynamic class or price main
            # In price-main: notice honeypot has style="display: none;"
            visible_price_spans = await page.evaluate('''() => {
                const main = document.querySelector('.price-main');
                if (!main) return null;
                // find visible text nodes or elements not display:none
                const children = Array.from(main.children);
                return children.map(c => ({
                    tag: c.tagName,
                    class: c.className,
                    display: window.getComputedStyle(c).display,
                    text: c.innerText
                }));
            }''')
            
            print(f"   [Stock] Text: '{stock_text}', Class: '{stock_class}'")
            print("   [Price elements breakdown]:")
            for item in visible_price_spans or []:
                print(f"     - <{item['tag']} class='{item['class']}' display='{item['display']}'>: '{item['text']}'")
                
            await page.screenshot(path=f"scratch/prod_{product_id}_run_{run_index}.png")
            return {
                "productId": product_id,
                "status": "success",
                "stock": stock_text,
                "elements": visible_price_spans
            }
        else:
            status_text = await page.locator(".price-status").text_content()
            substatus_text = await page.locator(".price-substatus").text_content()
            print(f"   Failed to reveal: status='{status_text}', substatus='{substatus_text}'")
            return {
                "productId": product_id,
                "status": "error",
                "error": status_text,
                "substatus": substatus_text
            }
    else:
        print("   Button could not be enabled.")
        return {
            "productId": product_id,
            "status": "button_disabled"
        }

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        results = []
        # Test product 48 run 1
        results.append(await reveal_product_price(page, 48, run_index=1))
        await asyncio.sleep(1)
        
        # Test product 48 run 2 (repeated load to verify consistency)
        results.append(await reveal_product_price(page, 48, run_index=2))
        await asyncio.sleep(1)
        
        # Test product 675
        results.append(await reveal_product_price(page, 675, run_index=1))
        await asyncio.sleep(1)
        
        # Test product 12
        results.append(await reveal_product_price(page, 12, run_index=1))
        await asyncio.sleep(1)

        with open("scratch/reveal_test_results.json", "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
            
        print("\nAll results saved to scratch/reveal_test_results.json")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
