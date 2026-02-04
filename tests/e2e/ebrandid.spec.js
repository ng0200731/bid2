import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite for E-BrandID System
 * Generated based on manual testing session
 * Test Data: PO# 1290121, Item# 3058CARE9WHT
 */

test.describe('E-BrandID System - Download Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8766/');
    await expect(page).toHaveTitle('E-BrandID System');
  });

  test('should load the application homepage', async ({ page }) => {
    // Verify main heading
    await expect(page.getByRole('heading', { name: 'E-BrandID', level: 2 })).toBeVisible();

    // Verify navigation buttons
    await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Order Status' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Item' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Message' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Profile' })).toBeVisible();
  });

  test('should fetch PO information successfully', async ({ page }) => {
    // Enter PO number
    const poInput = page.getByRole('textbox', { name: 'Enter PO Number(s):' });
    await poInput.fill('1290121');

    // Click Fetch PO Information button
    await page.getByRole('button', { name: 'Fetch PO Information' }).click();

    // Wait for processing to complete
    await expect(page.getByText('Process completed!')).toBeVisible({ timeout: 30000 });

    // Verify results table appears
    await expect(page.getByRole('heading', { name: 'Results', level: 2 })).toBeVisible();

    // Verify PO number appears in results
    await expect(page.getByRole('cell', { name: '1290121' })).toBeVisible();
  });

  test('should handle PO with no files gracefully', async ({ page }) => {
    // Enter PO number
    await page.getByRole('textbox', { name: 'Enter PO Number(s):' }).fill('1290121');

    // Click Fetch PO Information
    await page.getByRole('button', { name: 'Fetch PO Information' }).click();

    // Wait for completion
    await expect(page.getByText('Process completed!')).toBeVisible({ timeout: 30000 });

    // Verify "No Files" status
    const statusCell = page.locator('tr:has-text("1290121")').getByRole('cell').nth(1);
    await expect(statusCell).toHaveText('No Files');

    // Verify zero counts
    await expect(page.locator('tr:has-text("1290121")').getByRole('cell').nth(2)).toHaveText('0'); // Items Processed
    await expect(page.locator('tr:has-text("1290121")').getByRole('cell').nth(3)).toHaveText('0'); // Files Downloaded
    await expect(page.locator('tr:has-text("1290121")').getByRole('cell').nth(5)).toHaveText('0'); // Errors
  });

  test('should disable buttons during processing', async ({ page }) => {
    // Enter PO number
    await page.getByRole('textbox', { name: 'Enter PO Number(s):' }).fill('1290121');

    // Click Fetch PO Information
    await page.getByRole('button', { name: 'Fetch PO Information' }).click();

    // Verify buttons are disabled during processing
    await expect(page.getByRole('button', { name: 'Fetch PO Information' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Fetch Artwork' })).toBeDisabled();

    // Wait for completion
    await expect(page.getByText('Process completed!')).toBeVisible({ timeout: 30000 });

    // Verify buttons are re-enabled after completion
    await expect(page.getByRole('button', { name: 'Fetch PO Information' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Fetch Artwork' })).toBeEnabled();
  });

  test('should show progress messages during processing', async ({ page }) => {
    // Enter PO number
    await page.getByRole('textbox', { name: 'Enter PO Number(s):' }).fill('1290121');

    // Click Fetch PO Information
    await page.getByRole('button', { name: 'Fetch PO Information' }).click();

    // Verify initial progress messages appear (these are guaranteed to show)
    await expect(page.getByText(/Job started with ID:/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Fetching information for 1 PO/)).toBeVisible({ timeout: 10000 });

    // Wait for completion - other messages may appear too quickly to catch
    await expect(page.getByText('Process completed!')).toBeVisible({ timeout: 30000 });
  });
});

test.describe('E-BrandID System - Item Tracking Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8766/');
  });

  test('should navigate to Item Tracking page', async ({ page }) => {
    // Click Item button
    await page.getByRole('button', { name: 'Item' }).click();

    // Verify Item Tracking page loads
    await expect(page.getByRole('heading', { name: 'Item Tracking', level: 1 })).toBeVisible();

    // Verify table headers (use exact: true to avoid matching multiple elements)
    await expect(page.getByRole('columnheader', { name: '#', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Internal Seq#' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Item #' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();
  });

  test('should display item 3058CARE9WHT in the table', async ({ page }) => {
    // Navigate to Item Tracking
    await page.getByRole('button', { name: 'Item' }).click();

    // Wait for page to load (with longer timeout due to large data)
    await expect(page.getByRole('heading', { name: 'Item Tracking', level: 1 })).toBeVisible({ timeout: 10000 });

    // Wait for table data to load - use text locator which is more reliable
    await expect(page.locator('text=3058CARE9WHT').first()).toBeVisible({ timeout: 30000 });

    // Verify associated data
    await expect(page.locator('text=ITEM0008207').first()).toBeVisible({ timeout: 10000 });
  });

  test('should have View Detail button for items', async ({ page }) => {
    // Navigate to Item Tracking
    await page.getByRole('button', { name: 'Item' }).click();

    // Wait for table to load
    await expect(page.getByRole('heading', { name: 'Item Tracking', level: 1 })).toBeVisible({ timeout: 10000 });

    // Wait for table data to load first
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 30000 });

    // Verify View Detail button exists - use locator with text content
    await expect(page.locator('button:has-text("View Detail")').first()).toBeVisible({ timeout: 10000 });
  });

  test('should have search filters in table headers', async ({ page }) => {
    // Navigate to Item Tracking
    await page.getByRole('button', { name: 'Item' }).click();

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Item Tracking', level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify filter textboxes exist in table header row
    const filterInputs = page.locator('thead input[type="text"], thead textbox');
    await expect(filterInputs.first()).toBeVisible({ timeout: 30000 });
  });
});

test.describe('E-BrandID System - Performance Issues', () => {
  test('KNOWN ISSUE: Item Tracking page has performance problems with large datasets', async ({ page }) => {
    // This test documents a known performance issue
    await page.goto('http://localhost:8766/');

    // Navigate to Item Tracking
    await page.getByRole('button', { name: 'Item' }).click();

    // The page snapshot is 4.1MB which causes timeouts
    // This is a performance issue that needs to be addressed
    // Recommendation: Implement pagination or virtual scrolling

    test.info().annotations.push({
      type: 'issue',
      description: 'Item Tracking page generates 4.1MB snapshot causing browser timeouts. Needs pagination or virtual scrolling.'
    });
  });
});
