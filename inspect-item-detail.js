import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));

async function inspectItemDetailPage() {
  console.log('Launching browser to inspect item detail page...');

  const browser = await chromium.launch({
    headless: false,
    timeout: 30000
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login first
    console.log('Logging in...');
    await page.goto(config.login_url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[name="txtUserName"]', config.username);
    await page.fill('input[name="txtPassword"]', config.password);
    await page.click('img[onclick*="Login"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log('Login successful');

    // Navigate to PO page
    const poNumber = '1303061';
    const poUrl = `${config.po_detail_url}?po_id=${poNumber}`;
    console.log(`\nNavigating to PO ${poNumber}...`);
    await page.goto(poUrl, { waitUntil: 'networkidle', timeout: 30000 });

    console.log('Clicking first item link to open detail page...');

    // Click the first item link - it will open a popup window
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.click('a[href="#"]:has-text("16025PATC10onx")')
    ]);

    console.log('Item detail popup opened');
    await popup.waitForLoadState('networkidle', { timeout: 30000 });

    // Get all links from the popup
    const links = await popup.$$eval('a[href]', elements =>
      elements.map(el => ({
        href: el.href,
        text: el.textContent?.trim(),
        id: el.id,
        className: el.className
      }))
    );

    console.log(`\n=== Found ${links.length} links in item detail page ===`);
    links.forEach((link, i) => {
      console.log(`${i + 1}. Text: "${link.text}" | Href: ${link.href}`);
    });

    // Save popup HTML
    const html = await popup.content();
    fs.writeFileSync(path.join(__dirname, 'item-detail-page.html'), html);
    console.log('\n✓ Item detail page HTML saved to item-detail-page.html');

    // Take screenshot
    await popup.screenshot({ path: path.join(__dirname, 'item-detail-page.png'), fullPage: true });
    console.log('✓ Screenshot saved to item-detail-page.png');

    console.log('\nBrowser will stay open for 60 seconds for manual inspection...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

inspectItemDetailPage();
