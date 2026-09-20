const { chromium } = require('@playwright/test');

async function intercept() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('request', req => console.log('REQ:', req.method(), req.url()));

  await page.goto('https://demo.inelabteamdev.com');
  
  // Try to find the search box and type
  await page.fill('input[type="text"]', 'Copperpot');
  await page.waitForTimeout(500); // Wait for debounce or anything
  
  // if there's a search button, click it, else press enter
  try {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
  } catch (e) {}

  await browser.close();
}
intercept();
