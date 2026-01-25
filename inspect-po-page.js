import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));

async function inspectPOPage() {
  console.log('Launching browser to inspect PO detail page...');

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

    console.log('Page loaded. Extracting page structure...');

    // Get all links
    const links = await page.$$eval('a[href]', elements =>
      elements.map(el => ({
        href: el.href,
        text: el.textContent?.trim(),
        id: el.id,
        className: el.className,
        innerHTML: el.innerHTML.substring(0, 100)
      }))
    );

    console.log(`\n=== Found ${links.length} total links ===`);
    links.forEach((link, i) => {
      console.log(`${i + 1}. Text: "${link.text}" | Href: ${link.href}`);
    });

    // Get all images that might be clickable
    const images = await page.$$eval('img[onclick], img[src*="download"], img[src*="file"]', elements =>
      elements.map(el => ({
        src: el.src,
        alt: el.alt,
        onclick: el.getAttribute('onclick'),
        className: el.className
      }))
    );

    console.log(`\n=== Found ${images.length} clickable images ===`);
    images.forEach((img, i) => {
      console.log(`${i + 1}. Alt: "${img.alt}" | Onclick: ${img.onclick}`);
    });

    // Save page HTML for inspection
    const html = await page.content();
    fs.writeFileSync(path.join(__dirname, 'po-page.html'), html);
    console.log('\n✓ Page HTML saved to po-page.html');

    // Take a screenshot
    await page.screenshot({ path: path.join(__dirname, 'po-page.png'), fullPage: true });
    console.log('✓ Screenshot saved to po-page.png');

    console.log('\nBrowser will stay open for 60 seconds for manual inspection...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

inspectPOPage();
