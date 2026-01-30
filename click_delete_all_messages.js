import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to the application
    console.log('Navigating to http://localhost:8766...');
    await page.goto('http://localhost:8766', { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Click on the "Message" button to navigate to the Message page
    console.log('Clicking on Message button...');
    await page.click('button:has-text("Message")');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Wait a moment for the page to fully load
    await page.waitForTimeout(1000);

    // Take a screenshot to see the Message page
    await page.screenshot({ path: 'message_page.png', fullPage: true });
    console.log('Screenshot of Message page saved to message_page.png');

    // Check if "Delete All Messages" button is visible
    const deleteAllButton = page.locator('button:has-text("Delete All Messages")');
    const isVisible = await deleteAllButton.isVisible();
    console.log(`Delete All Messages button visible: ${isVisible}`);

    if (isVisible) {
      // Click the "Delete All Messages" button
      console.log('Clicking Delete All Messages button...');
      await deleteAllButton.click();

      // Wait for any confirmation dialog or action to complete
      await page.waitForTimeout(2000);

      // Take a screenshot after clicking
      await page.screenshot({ path: 'after_delete.png', fullPage: true });
      console.log('Screenshot after delete saved to after_delete.png');

      console.log('Successfully clicked Delete All Messages button!');
    } else {
      console.log('Delete All Messages button is not visible on the Message page.');

      // List all visible buttons for debugging
      const buttons = await page.locator('button').all();
      console.log('\nVisible buttons on Message page:');
      for (let i = 0; i < buttons.length; i++) {
        try {
          const text = await buttons[i].innerText();
          const visible = await buttons[i].isVisible();
          if (visible) {
            console.log(`  - ${text}`);
          }
        } catch (e) {
          // Skip buttons that can't be read
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'error_screenshot.png', fullPage: true });
    console.log('Error screenshot saved to error_screenshot.png');
  } finally {
    await browser.close();
  }
})();
