import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
  });

  test('displays dashboard header', async ({ page }) => {
    await expect(page.getByText('PricePulse')).toBeVisible();
    await expect(page.getByText('Real-time observability of your price intelligence system.')).toBeVisible();
  });

  test('navigates to products page', async ({ page }) => {
    // Click on "Tracked Products" in sidebar
    await page.getByRole('link', { name: 'Tracked Products' }).click();
    
    // Expect URL to change
    await expect(page).toHaveURL(/.*\/products/);
    
    // Expect Products page header
    await expect(page.getByRole('heading', { name: 'Tracked Products', exact: true })).toBeVisible();
    await expect(page.getByText('Products actively monitored for price and stock changes.')).toBeVisible();
  });

  test('navigates to search page', async ({ page }) => {
    // Click on "Search Store" in sidebar
    await page.getByRole('link', { name: 'Search Store' }).click();
    
    await expect(page).toHaveURL(/.*\/search/);
    
    // Check search functionality mock
    await page.route('**/api/products/search*', async (route) => {
      await route.fulfill({ json: { success: true, data: [] } });
    });

    const searchInput = page.getByPlaceholder('Search by name, category, or SKU...');
    await searchInput.fill('iphone');
    
    const searchBtn = page.getByRole('button', { name: 'Search' });
    await searchBtn.click();
    
    // Should display no results based on mock
    await expect(page.getByText('No products found matching "iphone"')).toBeVisible();
  });
});
