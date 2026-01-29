import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, savePOHeader, savePOItem, saveDownloadHistory, saveMessage } from './database.js';

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
      timeout: config.timeout_seconds * 1000,
      args: [
        '--disable-features=NetworkService',
        '--disable-features=VizDisplayCompositor',
        '--host-resolver-rules="MAP app.e-brandid.com 13.77.146.165"'
      ]
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
   * Navigate to Purchase Order list page (one-time setup)
   */
  async navigateToPOListPage() {
    console.log('\nNavigating to Purchase Order list page...');

    try {
      // After login, we should already be on index.aspx with frames
      // Wait for the page to fully load
      console.log('Waiting for page to load completely...');
      await this.page.waitForLoadState('networkidle', {
        timeout: config.timeout_seconds * 1000
      });
      await this.page.waitForTimeout(2000);

      // The page uses frames - find the navigation frame
      console.log('Looking for navigation frame...');
      const navigFrame = this.page.frames().find(f => f.name() === 'navig' || f.url().includes('mnuSetup.aspx'));

      if (!navigFrame) {
        throw new Error('Could not find navigation frame');
      }

      console.log('Found navigation frame');

      // Hover over "Search" menu in the navigation frame
      console.log('Hovering over Search menu...');
      const searchDiv = navigFrame.locator('div').filter({ hasText: /^Search$/ }).first();
      await searchDiv.hover();

      // Wait for menu to expand
      await this.page.waitForTimeout(1500);

      // The menu items appear in the SPACE frame, not the navigation frame
      // Find the space frame first
      let spaceFrame = this.page.frames().find(f => f.name() === 'space');

      if (!spaceFrame) {
        throw new Error('Could not find space frame');
      }

      // Click on "Purchase Order" from the dropdown menu in the space frame
      console.log('Clicking Purchase Order from menu...');
      await spaceFrame.click('text=Purchase Order');

      // Wait for the space frame to navigate to the PO list page
      await this.page.waitForTimeout(3000);

      console.log('Purchase Order list page should be loaded');

      // Re-find the space frame after navigation
      spaceFrame = this.page.frames().find(f => f.name() === 'space');

      if (!spaceFrame) {
        throw new Error('Could not find space frame');
      }

      console.log('Found space frame');

      // Select "All" from status dropdown in the space frame
      console.log('Selecting "All" status...');
      await spaceFrame.selectOption('#ddlStatus', '0');
      await this.page.waitForTimeout(1000);

      console.log('✓ Purchase Order list page ready');
      return true;
    } catch (error) {
      console.error('Failed to navigate to PO list page:', error);
      throw error;
    }
  }

  /**
   * Navigate to Message page
   */
  async navigateToMessagePage() {
    console.log('\nNavigating to Message page...');

    try {
      // After login, we should already be on index.aspx with frames
      // Wait for the page to fully load
      console.log('Waiting for page to load completely...');
      await this.page.waitForLoadState('networkidle', {
        timeout: config.timeout_seconds * 1000
      });
      await this.page.waitForTimeout(2000);

      // The page uses frames - find the navigation frame
      console.log('Looking for navigation frame...');
      const navigFrame = this.page.frames().find(f => f.name() === 'navig' || f.url().includes('mnuSetup.aspx'));

      if (!navigFrame) {
        throw new Error('Could not find navigation frame');
      }

      console.log('Found navigation frame');

      // Hover over "Messages" menu and click it
      console.log('Hovering over Messages menu and clicking...');
      const messagesDiv = navigFrame.locator('div').filter({ hasText: /^Messages$/ }).first();
      await messagesDiv.hover();
      await this.page.waitForTimeout(500);
      await messagesDiv.click();

      // Wait for the message page to load
      await this.page.waitForTimeout(3000);

      console.log('✓ Message page ready');
      return true;
    } catch (error) {
      console.error('Failed to navigate to Message page:', error);
      throw error;
    }
  }

  /**
   * Extract messages from the Messages page (only 1/26/26)
   */
  async extractMessages() {
    console.log('\nExtracting messages from Messages page...');

    try {
      // Find the space frame
      const spaceFrame = this.page.frames().find(f => f.name() === 'space');

      if (!spaceFrame) {
        throw new Error('Could not find space frame');
      }

      // Extract all messages from the table, filtering by date 1/26/26
      const messages = await spaceFrame.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tr'));
        const messageData = [];
        const debugInfo = [];

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const row = rows[rowIndex];
          const cells = row.querySelectorAll('td');

          // Debug: log what we find
          if (cells.length > 0) {
            debugInfo.push({
              cellCount: cells.length,
              cell0: cells[0]?.textContent.trim().substring(0, 50),
              cell1: cells[1]?.textContent.trim().substring(0, 50),
              cell2: cells[2]?.textContent.trim().substring(0, 50),
              cell3: cells[3]?.textContent.trim().substring(0, 50),
              cell4: cells[4]?.textContent.trim().substring(0, 50),
              cell5: cells[5]?.textContent.trim().substring(0, 50),
              cell6: cells[6]?.textContent.trim().substring(0, 50),
              cell7: cells[7]?.textContent.trim().substring(0, 50),
              hasSubHeader: cells[0]?.className?.includes('SubHeader')
            });
          }

          // Skip header rows (rows with SubHeader class or th elements)
          if (cells.length > 0 && cells[0].className?.includes('SubHeader')) {
            continue;
          }

          if (cells.length >= 8) {
            // Extract: Ref#, Author, Received, Subject, Comment
            // Note: First 3 cells are icon columns, data starts at cells[3]
            const refNumber = cells[3].textContent.trim();
            const author = cells[4].textContent.trim();
            const receivedDate = cells[5].textContent.trim();
            const subjectCell = cells[6];
            const subject = subjectCell.textContent.trim();
            const comment = cells[7].textContent.trim();

            // Only include messages from 1/26/26 (any time from 00:00 to 23:59)
            // The Received column format is like "1/26/26 22:25"
            // Check if the date starts with "1/26/26"
            if (receivedDate.startsWith('1/26/26') || receivedDate.startsWith('01/26/26')) {
              // Check if Subject cell has a link
              const subjectLink = subjectCell.querySelector('a');
              const hasSubjectLink = subjectLink !== null;

              messageData.push({
                refNumber,
                author,
                receivedDate,
                subject,
                comment,
                rowIndex,
                hasSubjectLink
              });
            }
          }
        }

        return { messages: messageData, debug: debugInfo };
      });

      console.log(`✓ Found ${messages.messages.length} messages from 1/26/26`);
      console.log('Debug info (first 5 rows):', JSON.stringify(messages.debug.slice(0, 5), null, 2));

      // Limit to first 10 messages
      const messagesToProcess = messages.messages.slice(0, 10);
      console.log(`Processing first ${messagesToProcess.length} messages...`);

      // For each message, click into the Subject to get full details
      for (const message of messagesToProcess) {
        if (message.hasSubjectLink) {
          console.log(`\nClicking into message Subject: ${message.subject}`);

          // Wait for popup to open when clicking the Subject link in the specific row
          const [popup] = await Promise.all([
            this.page.waitForEvent('popup'),
            spaceFrame.evaluate((rowIndex) => {
              const rows = Array.from(document.querySelectorAll('table tr'));
              const row = rows[rowIndex];
              const cells = row.querySelectorAll('td');
              const subjectCell = cells[6]; // Subject column
              const link = subjectCell.querySelector('a');
              if (link) {
                link.click();
              }
            }, message.rowIndex)
          ]);

          // Wait for popup to load
          await popup.waitForLoadState('networkidle');
          await popup.waitForTimeout(1000);

          // Capture the message link (URL)
          const messageLink = popup.url();
          console.log(`  Message link: ${messageLink}`);

          // Extract CommentId from URL
          let commentId = null;
          try {
            const url = new URL(messageLink);
            commentId = url.searchParams.get('CommentId');
            console.log(`  Comment ID: ${commentId}`);
          } catch (error) {
            console.log(`  Could not extract Comment ID: ${error.message}`);
          }

          // Extract full details from the popup with HTML styling
          const fullDetails = await popup.evaluate(() => {
            // Get the full HTML content with styling
            return document.body.innerHTML;
          });

          message.fullDetails = fullDetails;
          message.messageLink = messageLink;
          message.commentId = commentId;
          console.log(`✓ Extracted details for Subject: ${message.subject}`);

          // Close the popup
          await popup.close();
          await this.page.waitForTimeout(500);
        }
      }

      return messages;
    } catch (error) {
      console.error('Failed to extract messages:', error);
      throw error;
    }
  }

  /**
   * Extract PO data from the Purchase Order list table
   * Assumes we're already on the list page
   * @param {string} poNumber - Purchase Order number
   */
  async extractPOListData(poNumber) {
    console.log(`\nSearching for PO ${poNumber} in list...`);

    try {
      // Find the space frame
      const spaceFrame = this.page.frames().find(f => f.name() === 'space');

      if (!spaceFrame) {
        throw new Error('Could not find space frame');
      }

      // Enter PO number in search box in the space frame
      console.log(`Entering PO number ${poNumber}...`);
      await spaceFrame.fill('#txtWONum', poNumber);
      await this.page.waitForTimeout(500);

      // Submit search - press Enter
      console.log('Submitting search...');
      await spaceFrame.press('#txtWONum', 'Enter');
      await this.page.waitForTimeout(3000);

      // Extract data from the table row in the space frame
      const listData = await spaceFrame.evaluate((po) => {
        // Find all table rows with data cells
        const rows = Array.from(document.querySelectorAll('table tr'));

        // Look for the row containing this PO number
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 9) {
            // Get text from first cell, checking both direct text and link text
            const firstCellText = cells[0].textContent.trim();
            const linkText = cells[0].querySelector('a')?.textContent.trim();

            // Check if either matches the PO number
            if (firstCellText === po || linkText === po) {
              return {
                poNumber: firstCellText || linkText,
                vendorName: cells[1]?.textContent.trim() || '',
                poDate: cells[2]?.textContent.trim() || '',
                shipBy: cells[3]?.textContent.trim() || '',
                shipVia: cells[4]?.textContent.trim() || '',
                orderType: cells[5]?.textContent.trim() || '',
                status: cells[6]?.textContent.trim() || '',
                loc: cells[7]?.textContent.trim() || '',
                prodRep: cells[8]?.textContent.trim() || ''
              };
            }
          }
        }
        return null;
      }, poNumber);

      if (listData) {
        console.log('✓ Found PO in list, extracted table data');
        console.log(`  Vendor: ${listData.vendorName}`);
        console.log(`  PO Date: ${listData.poDate}`);
        console.log(`  Ship By: ${listData.shipBy}`);
        console.log(`  Ship Via: ${listData.shipVia}`);
        console.log(`  Order Type: ${listData.orderType}`);
        console.log(`  Status: ${listData.status}`);
        console.log(`  Loc: ${listData.loc}`);
        console.log(`  Prod Rep: ${listData.prodRep}`);
        return listData;
      } else {
        console.log('⚠ PO not found in list table');
        return null;
      }
    } catch (error) {
      console.log(`⚠ Could not extract list data: ${error.message}`);
      return null;
    }
  }

  /**
   * Navigate to PO detail page
   * @param {string} poNumber - Purchase Order number
   */
  async navigateToPODetailPage(poNumber) {
    const poUrl = `${config.po_detail_url}?po_id=${poNumber}`;
    console.log(`\nNavigating to PO detail page ${poNumber}...`);

    await this.page.goto(poUrl, {
      waitUntil: 'networkidle',
      timeout: config.timeout_seconds * 1000
    });

    // Verify page loaded successfully
    const currentUrl = this.page.url();
    if (!currentUrl.includes(`po_id=${poNumber}`)) {
      throw new Error(`Failed to navigate to PO ${poNumber}`);
    }

    console.log(`✓ PO detail page loaded`);
    return true;
  }

  /**
   * Navigate back to Purchase Order list page
   */
  async navigateBackToPOListPage() {
    console.log('\nNavigating back to index page...');

    // Navigate back to index.aspx (which has the list page in the space frame)
    const indexPageUrl = 'https://app.e-brandid.com/Bidnet/index.aspx';

    await this.page.goto(indexPageUrl, {
      waitUntil: 'networkidle',
      timeout: config.timeout_seconds * 1000
    });

    await this.page.waitForTimeout(2000);

    // Find the space frame
    const spaceFrame = this.page.frames().find(f => f.name() === 'space');
    if (!spaceFrame) {
      throw new Error('Could not find space frame');
    }

    console.log('✓ Back on index page with list page loaded');
    return true;
  }

  /**
   * Extract PO header information from the page
   */
  async extractPOHeader(poNumber, listData = null) {
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
        totalAmount: null
      };
    });

    poData.poNumber = poNumber; // Ensure PO number is set

    // Merge list data if available
    if (listData) {
      poData.poDate = listData.poDate || null;
      poData.shipBy = listData.shipBy || null;
      poData.shipVia = listData.shipVia || null;
      poData.orderType = listData.orderType || null;
      poData.loc = listData.loc || null;
      poData.prodRep = listData.prodRep || null;
      // Use status from list if detail page status is empty
      if (!poData.status && listData.status) {
        poData.status = listData.status;
      }
      // Use vendor name from list if detail page vendor name is empty
      if (!poData.vendorName && listData.vendorName) {
        poData.vendorName = listData.vendorName;
      }
    } else {
      // Set to null if no list data
      poData.poDate = null;
      poData.shipBy = null;
      poData.shipVia = null;
      poData.orderType = null;
      poData.loc = null;
      poData.prodRep = null;
    }

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
      // Step 1: Navigate to PO list page (hover Search → click Purchase Order)
      await this.navigateToPOListPage();

      // Step 2: Search and extract data from the PO list table
      const listData = await this.extractPOListData(poNumber);

      // Step 3: Navigate to PO detail page
      await this.navigateToPODetailPage(poNumber);

      // Step 4: Extract and save PO header information (merge with list data)
      try {
        const poHeader = await this.extractPOHeader(poNumber, listData);
        savePOHeader(poHeader);
        console.log('✓ PO header saved to database');
      } catch (error) {
        console.log(`⚠ Could not save PO header: ${error.message}`);
        throw error;
      }

      // Step 5: Extract and save PO line items
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

      // Step 6: Navigate back to index page for next PO
      await this.navigateBackToPOListPage();

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
      // Step 1: Navigate to PO list page (hover Search → click Purchase Order)
      await this.navigateToPOListPage();

      // Step 2: Search and extract data from the PO list table
      const listData = await this.extractPOListData(poNumber);

      // Step 3: Navigate to PO detail page
      await this.navigateToPODetailPage(poNumber);

      // Step 4: Extract and save PO header information (merge with list data)
      try {
        const poHeader = await this.extractPOHeader(poNumber, listData);
        savePOHeader(poHeader);
        console.log('✓ PO header saved to database');
      } catch (error) {
        console.log(`⚠ Could not save PO header: ${error.message}`);
      }

      // Step 5: Extract and save PO line items
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
        // Navigate back to index page even if no items
        await this.navigateBackToPOListPage();
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

      // Step 6: Navigate back to index page for next PO
      await this.navigateBackToPOListPage();

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
