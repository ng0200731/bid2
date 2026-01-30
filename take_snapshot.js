import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to the application
    await page.goto('http://localhost:8766', { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: 'current_snapshot.png', fullPage: true });
    console.log('Screenshot saved to current_snapshot.png');

    // Get page title
    const title = await page.title();
    console.log(`\nPage Title: ${title}`);

    // Get all buttons
    const buttons = await page.locator('button').all();
    console.log(`\nFound ${buttons.length} buttons:`);
    for (let i = 0; i < buttons.length; i++) {
      try {
        const text = await buttons[i].innerText();
        const isVisible = await buttons[i].isVisible();
        console.log(`  ${i + 1}. '${text}' (visible: ${isVisible})`);
      } catch (e) {
        console.log(`  ${i + 1}. [Could not get button text]`);
      }
    }

    // Save HTML content
    const content = await page.content();
    fs.writeFileSync('current_snapshot.html', content, 'utf-8');
    console.log('\nHTML content saved to current_snapshot.html');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
