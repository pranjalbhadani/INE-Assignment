import { createIsolatedSession } from '../src/scraper/browser/browserPool';
import { navigateToProduct, dismissCookieOverlayIfPresent, performHumanInteraction, triggerReveal, waitForPriceState } from '../src/scraper/browser/pageInteractions';
import { Page } from 'playwright';

async function dumpDom(page: Page) {
  const container = page.locator('.price-success');
  if (await container.count() === 0) {
    console.log('No .price-success found');
    return;
  }

  const result = await page.evaluate(() => {
    const root = document.querySelector('.price-success');
    if (!root) return [];

    const nodes: any[] = [];
    const elements = [root, ...Array.from(root.querySelectorAll('*'))];
    elements.forEach(el => {
      const style = window.getComputedStyle(el);
      nodes.push({
        tag: el.tagName,
        className: el.className,
        textContent: el.textContent?.trim().replace(/\s+/g, ' '),
        innerText: (el as HTMLElement).innerText?.trim().replace(/\s+/g, ' '),
        ariaHidden: el.getAttribute('aria-hidden'),
        dataPrice: el.getAttribute('data-price'),
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity
      });
    });
    return nodes;
  });

  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const session = await createIsolatedSession(false);
  const page = session.page;
  
  try {
    console.log('Navigating...');
    await navigateToProduct(page, 'https://demo.inelabteamdev.com/product/12');
    console.log('Dismissing cookies...');
    await dismissCookieOverlayIfPresent(page);
    console.log('Interacting...');
    await performHumanInteraction(page);
    console.log('Revealing...');
    await triggerReveal(page);
    console.log('Waiting for price state...');
    
    // Increase timeout in debug script to 45s
    await Promise.race([
      page.waitForSelector('.price-success', { state: 'attached', timeout: 45000 }),
      page.waitForSelector('.price-error', { state: 'attached', timeout: 45000 })
    ]);
    console.log('Dumping DOM...');
    await dumpDom(page);
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    await session.close();
  }
}

main().catch(console.error);
