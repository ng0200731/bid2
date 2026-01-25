import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));

async function inspectLoginPage() {
  console.log('Launching browser to inspect login page...');

  const browser = await chromium.launch({
    headless: false,
    timeout: 30000
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto(config.login_url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Page loaded. Extracting form structure...');

    // Get all input fields
    const inputs = await page.$$eval('input', elements =>
      elements.map(el => ({
        type: el.type,
        name: el.name,
        id: el.id,
        value: el.value,
        placeholder: el.placeholder,
        className: el.className
      }))
    );

    console.log('\n=== Input Fields Found ===');
    inputs.forEach((input, i) => {
      console.log(`${i + 1}. Type: ${input.type}, Name: ${input.name}, ID: ${input.id}, Class: ${input.className}`);
    });

    // Get all buttons
    const buttons = await page.$$eval('button, input[type="submit"], input[type="button"]', elements =>
      elements.map(el => ({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        value: el.value,
        text: el.textContent?.trim(),
        className: el.className
      }))
    );

    console.log('\n=== Buttons Found ===');
    buttons.forEach((btn, i) => {
      console.log(`${i + 1}. Tag: ${btn.tag}, Type: ${btn.type}, ID: ${btn.id}, Text: ${btn.text}, Value: ${btn.value}`);
    });

    // Save page HTML for inspection
    const html = await page.content();
    fs.writeFileSync(path.join(__dirname, 'login-page.html'), html);
    console.log('\n✓ Page HTML saved to login-page.html');

    // Take a screenshot
    await page.screenshot({ path: path.join(__dirname, 'login-page.png'), fullPage: true });
    console.log('✓ Screenshot saved to login-page.png');

    console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

inspectLoginPage();
