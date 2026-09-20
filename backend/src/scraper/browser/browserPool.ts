import { chromium, Browser, BrowserContext, Page } from 'playwright';

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}

export async function createIsolatedSession(headless = true): Promise<BrowserSession> {
  const browser = await chromium.launch({
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

//   await page.addLocatorHandler(
//   page.locator('.cookie-overlay'),
//   async () => {
//     const acceptBtn = page.locator(
//       'button[aria-label="Accept cookies"]'
//     );

//     if (await acceptBtn.isVisible().catch(() => false)) {
//       await acceptBtn.click({ timeout: 2000 });
//     }
//   }
// );

await page.addLocatorHandler(
  page.locator('.cookie-overlay'),
  async () => {
    try {
      const acceptBtn = page.locator(
        'button[aria-label="Accept cookies"]'
      );

      if (await acceptBtn.isVisible().catch(() => false)) {
        await acceptBtn.click({ timeout: 1000 }).catch(() => {});
      }
    } catch {
      // Cookie overlay is optional and may disappear during rerender.
    }
  }
);
  return {
    browser,
    context,
    page,
    close: async () => {
      // Ensure all resources are closed correctly
      try { await page.close(); } catch (e) {}
      try { await context.close(); } catch (e) {}
      try { await browser.close(); } catch (e) {}
    }
  };
}
