import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, savePOHeader, savePOItem, saveDownloadHistory } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));

class EBrandIDDownloader {
  constructor() {
    this.browser = null;
    this.page = null;
    this.context = null;
    this.downloadResults = [];
  }

  /**
   * Initialize browser and create new page
   */
  async initialize() {
    console.log('Initializing browser...');
    this.browser = await chromium.launch({
      headless: config.headless,
      timeout: config.timeout_seconds * 1000
    });
    this.context = await this.browser.newContext({
      acceptDownloads: true
    });
    this.page = await this.context.newPage();
    console.log('Browser initialized successfully');
  }

  /**
   * Login to e-brandid system
   */
  async login() {
    console.log('Navigating to login page...');
    await this.page.goto(config.login_url, {
      waitUntil: 'networkidle',
      timeout: config.timeout_seconds * 1000
    });

    console.log('Attempting to login...');

    // Wait for login form to be visible
    await this.page.waitForSelector('input[name="txtUserName"]', {
      timeout: config.timeout_seconds * 1000
    });

    // Fill username and password
    await this.page.fill('input[name="txtUserName"]', config.username);
    await this.page.fill('input[name="txtPassword"]', config.password);

    // Click the login image button
    await this.page.click('img[onclick*="Login"]');

    // Wait for navigation after login
    await this.page.waitForLoadState('networkidle', {
      timeout: config.timeout_seconds * 1000
    });

    // Verify login success
    const currentUrl = this.page.url();
    if (currentUrl.includes('login.aspx')) {
      throw new Error('Login failed - still on login page');
    }

    console.log('Login successful!');
  }

  /**
   * Navigate to PO detail page
   * @param {string} poNumber - Purchase Order number
   */
  async navigateToPO(poNumber) {
    const poUrl = `${config.po_detail_url}?po_id=${poNumber}`;
    console.log(`\nNavigating to PO ${poNumber}...`);

    await this.page.goto(poUrl, {
      waitUntil: 'networkidle',
      timeout: config.timeout_seconds * 1000
    });

    // Verify page loaded successfully
    const currentUrl = this.page.url();
    if (!currentUrl.includes(`po_id=${poNumber}`)) {
      throw new Error(`Failed to navigate to PO ${poNumber}`);
    }

    console.log(`Successfully navigated to PO ${poNumber}`);
    return true;
  }

  /**
   * Extract PO header information from the page
   */
  async extractPOHeader(poNumber) {
    console.log('Extracting PO header information...');

    const poData = await this.page.evaluate(() => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : '';
      };

      return {
        poNumber: getText('#lblBidPOid'),
        status: getText('#lblStatus').replace(/<[^>]*>/g, '').replace(/\*+/g, '').trim(),
        company: getText('#lblCompany'),
        currency: getText('#lblCurrency'),
        terms: getText('#lblTerms'),
        vendorName: getText('#lblVendorName'),
        vendorAddress1: getText('#lblVendAddr1'),
        vendorAddress2: getText('#lblVendAddr2'),
        vendorAddress3: getText('#lblVendAddr3'),
        shipToName: getText('#lblBIDName'),
        shipToAddress1: getText('#lblBIDAddr1'),
        shipToAddress2: getText('#lblBIDAddr2'),
        shipToAddress3: getText('#lblBIDAddr3'),
        cancelDate: getText('#lblCancelDate'),
        totalAmount: null,
        poDate: getText('#lblPODate'),
        shipBy: getText('#lblShipBy'),
        shipVia: getText('#lblShipVia'),
        orderType: getText('#lblOrderType'),
        loc: getText('#lblLoc'),
        prodRep: getText('#lblProdRep')
      };
    });

    poData.poNumber = poNumber; // Ensure PO number is set
    return poData;
  }

  /**
   * Extract PO line items from the page
   */
  async extractPOItems(poNumber) {
    console.log('Extracting PO line items...');

    const items = await this.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#tblItems tbody tr, table[id*="tblItems"] tbody tr'));
      const itemRows = rows.filter(row => {
        const cells = row.querySelectorAll('td');
        return cells.length >= 9 && !row.classList.contains('tableHeaderText');
      });

      return itemRows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 9) return null;

        const parsePrice = (str) => {
          const cleaned = str.replace(/[$,]/g, '').trim();
          return cleaned ? parseFloat(cleaned) : 0;
        };

        const parseInt = (str) => {
          const cleaned = str.replace(/[,]/g, '').trim();
          return cleaned && cleaned !== 'NA' ? Number(cleaned) : 0;
        };

        return {
          itemNumber: cells[0].textContent.trim(),
          description: cells[1].textContent.trim(),
          color: cells[2].textContent.trim(),
          shipTo: cells[3].textContent.trim(),
          needBy: cells[4].textContent.trim(),
          qty: parseInt(cells[5].textContent),
          bundleQty: cells[6].textContent.trim(),
          unitPrice: parsePrice(cells[7].textContent),
          extension: parsePrice(cells[8].textContent)
        };
      }).filter(item => item !== null && item.itemNumber && !item.itemNumber.includes('Total'));
    });

    return items.map(item => ({ ...item, poNumber }));
  }

  /**
   * Get all item links from PO page
   */
  async getItemLinks() {
    console.log('Extracting item links from PO page...');

    const items = await this.page.$$eval('a[href="#"][onclick*="openItemDetail"]', (anchors) => {
      return anchors.map(a => ({
        itemNumber: a.textContent.trim(),
        onclick: a.getAttribute('onclick')
      }));
    });

    // Extract request_id and item_suffix_id from onclick attribute
    const itemDetails = items.map(item => {
      const match = item.onclick.match(/openItemDetail\((\d+),\s*(\d+)\)/);
      if (match) {
        return {
          itemNumber: item.itemNumber,
          requestId: match[1],
          itemSuffixId: match[2]
        };
      }
      return null;
    }).filter(item => item !== null);

    console.log(`Found ${itemDetails.length} items`);
    return itemDetails;
  }

  /**
   * Extract artwork download URL from item detail popup
   * @param {object} popup - Playwright page object for popup
   */
  async extractArtworkUrl(popup) {
    try {
      await popup.waitForLoadState('networkidle', { timeout: 10000 });

      // Look for the artwork download link
      const artworkUrl = await popup.$eval('a[id*="ArtworkImageDownload"]', (link) => {
        const onclick = link.getAttribute('onclick');
        // Extract URL from MM_openBrWindow('URL',...)
        const match = onclick.match(/MM_openBrWindow\('([^']+)'/);
        return match ? match[1] : null;
      });

      return artworkUrl;
    } catch (error) {
      console.log('  No artwork found for this item');
      return null;
    }
  }

  /**
   * Download artwork for a single item
   * @param {object} item - Item details
   * @param {string} poNumber - PO number for folder organization
   */
  async downloadItemArtwork(item, poNumber) {
    console.log(`\n  Processing item: ${item.itemNumber}`);

    try {
      // Navigate directly to item detail page instead of using popup
      const itemDetailUrl = `https://app.e-brandid.com/Bidnet/BidCustomer/ItemDetail.aspx?request_id=${item.requestId}&item_suffix_id=${item.itemSuffixId}`;

      // Create a new page for the item detail
      const itemPage = await this.context.newPage();
      await itemPage.goto(itemDetailUrl, { waitUntil: 'networkidle', timeout: 15000 });

      // Extract artwork URL
      const artworkUrl = await this.extractArtworkUrl(itemPage);

      if (!artworkUrl) {
        console.log('  ⚠ No artwork available');
        await itemPage.close();
        return { success: false, reason: 'No artwork found' };
      }

      console.log(`  Found artwork: ${path.basename(artworkUrl)}`);

      // Create download directory
      const downloadDir = path.join(__dirname, config.download_directory, poNumber);
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      // Download the file directly using fetch
      const response = await itemPage.request.get(artworkUrl);
      const buffer = await response.body();

      const filename = path.basename(artworkUrl);
      const filepath = path.join(downloadDir, filename);

      fs.writeFileSync(filepath, buffer);
      console.log(`  ✓ Downloaded: ${filename}`);

      await itemPage.close();

      return {
        success: true,
        itemNumber: item.itemNumber,
        filename: filename,
        filepath: filepath,
        size: buffer.length
      };

    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
      return {
        success: false,
        itemNumber: item.itemNumber,
        reason: error.message
      };
    }
  }

  /**
   * Fetch PO information without downloading artwork
   * @param {string} poNumber - Purchase Order number
   */
  async fetchPOInformation(poNumber) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Fetching PO Information: ${poNumber}`);
    console.log('='.repeat(60));

    const result = {
      poNumber: poNumber,
      status: 'success',
      itemsFound: 0,
      error: null
    };

    try {
      // Navigate to PO page
      await this.navigateToPO(poNumber);

      // Extract and save PO header information
      try {
        const poHeader = await this.extractPOHeader(poNumber);
        savePOHeader(poHeader);
        console.log('✓ PO header saved to database');
      } catch (error) {
        console.log(`⚠ Could not save PO header: ${error.message}`);
        throw error;
      }

      // Extract and save PO line items
      try {
        const poItems = await this.extractPOItems(poNumber);
        poItems.forEach(item => savePOItem(item));
        result.itemsFound = poItems.length;
        console.log(`✓ ${poItems.length} line items saved to database`);
      } catch (error) {
        console.log(`⚠ Could not save PO items: ${error.message}`);
        throw error;
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`PO ${poNumber} Information Fetched Successfully`);
      console.log(`  Items found: ${result.itemsFound}`);
      console.log('='.repeat(60));

    } catch (error) {
      console.error(`Error fetching PO ${poNumber}:`, error);
      result.status = 'failed';
      result.error = error.message;
    }

    return result;
  }

  /**
   * Download all artwork for a PO
   * @param {string} poNumber - Purchase Order number
   */
  async downloadPOArtwork(poNumber) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing PO: ${poNumber}`);
    console.log('='.repeat(60));

    const result = {
      poNumber: poNumber,
      status: 'success',
      itemsProcessed: 0,
      filesDownloaded: 0,
      totalSize: 0,
      files: [],
      errors: []
    };

    try {
      // Navigate to PO page
      await this.navigateToPO(poNumber);

      // Extract and save PO header information
      try {
        const poHeader = await this.extractPOHeader(poNumber);
        savePOHeader(poHeader);
        console.log('✓ PO header saved to database');
      } catch (error) {
        console.log(`⚠ Could not save PO header: ${error.message}`);
      }

      // Extract and save PO line items
      try {
        const poItems = await this.extractPOItems(poNumber);
        poItems.forEach(item => savePOItem(item));
        console.log(`✓ ${poItems.length} line items saved to database`);
      } catch (error) {
        console.log(`⚠ Could not save PO items: ${error.message}`);
      }

      // Get all item links
      const items = await this.getItemLinks();
      result.itemsProcessed = items.length;

      if (items.length === 0) {
        console.log('⚠ No items found for this PO');
        result.status = 'no_items';
        return result;
      }

      // Download artwork for each item
      for (const item of items) {
        const downloadResult = await this.downloadItemArtwork(item, poNumber);

        if (downloadResult.success) {
          result.filesDownloaded++;
          result.totalSize += downloadResult.size;
          result.files.push({
            itemNumber: downloadResult.itemNumber,
            filename: downloadResult.filename,
            size: downloadResult.size
          });
        } else {
          result.errors.push({
            itemNumber: downloadResult.itemNumber || item.itemNumber,
            reason: downloadResult.reason
          });
        }
      }

      // Save download history to database
      try {
        saveDownloadHistory({
          poNumber: poNumber,
          filesDownloaded: result.filesDownloaded,
          totalSize: result.totalSize,
          status: result.status
        });
        console.log('✓ Download history saved to database');
      } catch (error) {
        console.log(`⚠ Could not save download history: ${error.message}`);
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`PO ${poNumber} Summary:`);
      console.log(`  Items processed: ${result.itemsProcessed}`);
      console.log(`  Files downloaded: ${result.filesDownloaded}`);
      console.log(`  Total size: ${(result.totalSize / 1024 / 1024).toFixed(2)} MB`);
      if (result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.length}`);
      }
      console.log('='.repeat(60));

    } catch (error) {
      console.error(`\n✗ Failed to process PO ${poNumber}: ${error.message}`);
      result.status = 'failed';
      result.errors.push({ reason: error.message });
    }

    return result;
  }

  /**
   * Process multiple PO numbers in batch
   * @param {Array<string>} poNumbers - Array of PO numbers
   */
  async processBatch(poNumbers) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Starting batch processing of ${poNumbers.length} POs`);
    console.log('='.repeat(60));

    const results = [];

    for (const poNumber of poNumbers) {
      const result = await this.downloadPOArtwork(poNumber);
      results.push(result);
    }

    // Generate summary report
    this.generateReport(results);

    return results;
  }

  /**
   * Generate summary report
   * @param {Array} results - Array of PO processing results
   */
  generateReport(results) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('BATCH PROCESSING SUMMARY');
    console.log('='.repeat(60));

    const totalPOs = results.length;
    const successfulPOs = results.filter(r => r.status === 'success' && r.filesDownloaded > 0).length;
    const totalFiles = results.reduce((sum, r) => sum + r.filesDownloaded, 0);
    const totalSize = results.reduce((sum, r) => sum + r.totalSize, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`Total POs processed: ${totalPOs}`);
    console.log(`Successful POs: ${successfulPOs}`);
    console.log(`Total files downloaded: ${totalFiles}`);
    console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    if (totalErrors > 0) {
      console.log(`Total errors: ${totalErrors}`);
    }

    // Save detailed report to file
    const reportPath = path.join(__dirname, config.download_directory, 'download-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);
    console.log('='.repeat(60));
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('\nBrowser closed');
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  Single PO:  node index.js <PO_NUMBER>');
    console.log('  Batch:      node index.js <PO1> <PO2> <PO3> ...');
    console.log('  From file:  node index.js --file <path-to-file>');
    console.log('\nExamples:');
    console.log('  node index.js 1303061');
    console.log('  node index.js 1303061 1307938');
    console.log('  node index.js --file po-list.txt');
    process.exit(1);
  }

  let poNumbers = [];

  // Check if reading from file
  if (args[0] === '--file') {
    if (args.length < 2) {
      console.error('Error: Please specify a file path');
      process.exit(1);
    }
    const filePath = args[1];
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    poNumbers = fileContent.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } else {
    poNumbers = args;
  }

  console.log(`Processing ${poNumbers.length} PO(s): ${poNumbers.join(', ')}`);

  // Initialize database
  await initDatabase();
  console.log('Database initialized');

  const downloader = new EBrandIDDownloader();

  try {
    await downloader.initialize();
    await downloader.login();
    await downloader.processBatch(poNumbers);
  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await downloader.close();
  }
}

// Run if called directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main();
}

export default EBrandIDDownloader;
