import { Page } from 'playwright';
import { TransientError, PermanentError } from '../validator/errors';

export async function navigateToProduct(page: Page, targetUrl: string): Promise<void> {
  try {
    const res = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (res?.status() === 404) {
      throw new PermanentError('navigation', 'permanent_selector_missing', 'Product page returned 404');
    }
  } catch (err) {
    if (err instanceof PermanentError) throw err;
    throw new TransientError('navigation', 'transient_network', `Navigation failed: ${err}`);
  }
}

export async function dismissCookieOverlayIfPresent(page: Page): Promise<void> {
  try {
    const acceptBtn = page.locator('button[aria-label="Accept cookies"]');
    if (await acceptBtn.isVisible({ timeout: 2000 })) {
      await acceptBtn.click();
    }
  } catch (err) {
    // Ignore if not found or couldn't click, it's optional
  }
}

export async function performHumanInteraction(page: Page): Promise<void> {
  try {
    const priceBlock = page.locator('.price-block');
    
    // Wait for it to appear
    await priceBlock.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      // Ignored, count check will fail if it didn't appear
    });

    if (await priceBlock.count() === 0) {
      throw new PermanentError('interaction_hover', 'permanent_selector_missing', 'Could not find .price-block');
    }

    const box = await priceBlock.boundingBox();
    if (!box) throw new TransientError('interaction_hover', 'transient_timeout', 'Price block is not visible yet');

    // Perform >= 8 mouse moves over >= 600ms inside the box
    const steps = 10;
    const stepDelay = 80; // 10 * 80 = 800ms
    const startX = box.x + 10;
    const startY = box.y + 10;
    const stepX = (box.width - 20) / steps;
    const stepY = (box.height - 20) / steps;

    await page.mouse.move(startX, startY);
    for (let i = 1; i <= steps; i++) {
      await page.waitForTimeout(stepDelay);
      await page.mouse.move(startX + stepX * i, startY + stepY * i);
    }
  } catch (err) {
    if (err instanceof PermanentError || err instanceof TransientError) throw err;
    throw new TransientError('interaction_hover', 'transient_timeout', `Interaction failed: ${err}`);
  }
}

export async function triggerReveal(page: Page): Promise<void> {
  try {
    const revealBtn = page.locator('button[aria-label="Reveal price"]');
    
    // Wait for the button to become enabled (human interaction satisfies this)
    await revealBtn.waitFor({ state: 'attached', timeout: 5000 });
    
    const isDisabled = await revealBtn.isDisabled();
    if (isDisabled) {
      throw new TransientError('interaction_hover', 'transient_timeout', 'Reveal button did not become enabled after interaction');
    }

    await revealBtn.click();
  } catch (err) {
    if (err instanceof TransientError) throw err;
    throw new TransientError('interaction_hover', 'transient_timeout', `Could not click reveal: ${err}`);
  }
}

export async function waitForPriceState(page: Page): Promise<void> {
  try {
    // Wait for either success or error to appear in DOM. 
    // This could take a while due to proof of work, WASM, and retries.
    // Allow up to 30 seconds for the entire challenge/retry flow to resolve.
    await Promise.race([
      page.waitForSelector('.price-success', { state: 'attached', timeout: 30000 }),
      page.waitForSelector('.price-error', { state: 'attached', timeout: 30000 })
    ]);

    // Check if error state won
    if (await page.locator('.price-error').isVisible()) {
      // Look for the error message
      const errorMsg = await page.locator('.price-error').innerText().catch(() => 'Unknown store error');
      
      // If the store says "Too many requests", it's a 429
      if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('too many')) {
        throw new TransientError('price_fetch', 'transient_rate_limit', errorMsg);
      }
      // If it says "Server error" or 5xx
      if (errorMsg.includes('50') || errorMsg.toLowerCase().includes('server')) {
        throw new TransientError('price_fetch', 'transient_5xx', errorMsg);
      }

      // Default transient fallback for store's failed retries
      throw new TransientError('price_fetch', 'transient_network', errorMsg);
    }
    
    // Otherwise, success state won!
  } catch (err) {
    if (err instanceof TransientError) throw err;
    throw new TransientError('challenge_token', 'transient_timeout', `Timed out waiting for challenge/price resolve: ${err}`);
  }
}
