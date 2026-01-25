import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));

async function inspectPO() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login
    console.log('Logging in...');
    await page.goto(config.login_url, { waitUntil: 'networkidle' });
    await page.fill('input[name="txtUserName"]', config.username);
    await page.fill('input[name="txtPassword"]', config.password);
    await page.click('img[onclick*="Login"]');
    await page.waitForLoadState('networkidle');

    // Navigate to PO
    const poNumber = '1300371';
    const poUrl = `${config.po_detail_url}?po_id=${poNumber}`;
    console.log(`Navigating to PO ${poNumber}...`);
    await page.goto(poUrl, { waitUntil: 'networkidle' });

    // Extract all text content and structure
    const pageInfo = await page.evaluate(() => {
      // Find all span elements that might contain PO data
      const allSpans = Array.from(document.querySelectorAll('span'));
      const spanData = allSpans.map(span => ({
        id: span.id,
        text: span.textContent.trim(),
        classes: span.className
      })).filter(s => s.text && s.text.length < 200);

      // Find all table rows
      const tables = Array.from(document.querySelectorAll('table'));
      const tableInfo = tables.map((table, idx) => ({
        index: idx,
        id: table.id,
        rowCount: table.querySelectorAll('tr').length
      }));

      return {
        spans: spanData,
        tables: tableInfo,
        title: document.title
      };
    });

    console.log('\n=== PAGE INFO ===');
    console.log('Title:', pageInfo.title);

    console.log('\n=== SPAN ELEMENTS ===');
    pageInfo.spans.forEach(span => {
      if (span.id) {
        console.log(`ID: ${span.id} => "${span.text}"`);
      }
    });

    console.log('\n=== TABLES ===');
    pageInfo.tables.forEach(table => {
      console.log(`Table ${table.index}: ID="${table.id}", Rows=${table.rowCount}`);
    });

    // Save HTML to file for inspection
    const html = await page.content();
    fs.writeFileSync('po-page.html', html);
    console.log('\n✓ Full HTML saved to po-page.html');

    // Wait for user to inspect
    console.log('\nBrowser will stay open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

inspectPO();
