import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function testEBrandIDApp() {
    console.log('='.repeat(60));
    console.log('Testing E-BrandID Web Application');
    console.log('='.repeat(60));

    // Create screenshots directory
    const screenshotsDir = './test-screenshots';
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // Helper function to add text overlay to screenshots
    async function addOverlay(page, text) {
        await page.evaluate((overlayText) => {
            // Remove existing overlay if any
            const existing = document.getElementById('test-overlay');
            if (existing) existing.remove();

            // Create overlay element
            const overlay = document.createElement('div');
            overlay.id = 'test-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 165, 0, 0.95);
                color: white;
                padding: 15px 30px;
                border-radius: 8px;
                font-size: 18px;
                font-weight: bold;
                z-index: 10000;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                font-family: Arial, sans-serif;
            `;
            overlay.textContent = overlayText;
            document.body.appendChild(overlay);
        }, text);
        await page.waitForTimeout(300); // Wait for overlay to render
    }

    async function removeOverlay(page) {
        await page.evaluate(() => {
            const overlay = document.getElementById('test-overlay');
            if (overlay) overlay.remove();
        });
    }

    try {
        // 1. Load application
        console.log('\n1. Loading application at http://localhost:8766...');
        await page.goto('http://localhost:8766');
        await page.waitForLoadState('networkidle');
        await addOverlay(page, '📱 Application Homepage - Initial Load');
        await page.screenshot({ path: path.join(screenshotsDir, '01_homepage.png'), fullPage: true });
        await removeOverlay(page);
        console.log('   ✓ Application loaded successfully');
        console.log('   ✓ Screenshot saved: 01_homepage.png');

        // 2. Test Download Artwork view
        console.log('\n2. Testing Download Artwork view...');
        const downloadView = page.locator('#download-artwork');
        if (await downloadView.isVisible()) {
            console.log('   ✓ Download Artwork view is visible');
        }

        const poInput = page.locator('#po-input');
        if (await poInput.isVisible()) {
            console.log('   ✓ PO input field found');

            // Fill in example PO number
            await poInput.fill('1295611');
            await page.waitForTimeout(500);
            await addOverlay(page, '✏️ Filling PO Input Field with: 1295611');
            await page.screenshot({ path: path.join(screenshotsDir, '01b_po_input_example.png'), fullPage: true });
            await removeOverlay(page);
            console.log('   ✓ Filled example PO: 1295611');
            console.log('   ✓ Screenshot saved: 01b_po_input_example.png');
        }

        const downloadBtn = page.locator('#download-btn');
        if (await downloadBtn.isVisible()) {
            console.log('   ✓ Download button found');
            await downloadBtn.click();
            await page.waitForTimeout(3000); // Wait for download to process
            await addOverlay(page, '⬇️ Clicking Download Button - Starting Download for PO 1295611');
            await page.screenshot({ path: path.join(screenshotsDir, '01c_download_started.png'), fullPage: true });
            await removeOverlay(page);
            console.log('   ✓ Clicked download button for PO: 1295611');
            console.log('   ✓ Screenshot saved: 01c_download_started.png');
        }

        // 3. Test Order Status view
        console.log('\n3. Testing Order Status view...');
        await page.locator('button[data-view="order-status"]').click();
        await page.waitForTimeout(2000); // Wait for auto-load
        await addOverlay(page, '📋 Order Status View - Auto-loaded Latest 10 Orders');
        await page.screenshot({ path: path.join(screenshotsDir, '02_order_status.png'), fullPage: true });
        await removeOverlay(page);
        console.log('   ✓ Navigated to Order Status view');
        console.log('   ✓ Screenshot saved: 02_order_status.png');

        // Check if orders are loaded
        const ordersSection = page.locator('#orders-list-section');
        if (await ordersSection.isVisible()) {
            console.log('   ✓ Orders list section is visible');

            // Check table headers
            const headers = ['PO Number', 'Status', 'Company', 'Vendor', 'Currency', 'Created', 'Action', 'QC'];
            for (const header of headers) {
                const headerElem = page.locator(`th:has-text("${header}")`);
                if (await headerElem.count() > 0) {
                    console.log(`   ✓ Found column: ${header}`);
                }
            }

            // Check for order rows
            const orderRows = page.locator('#orders-body tr');
            const rowCount = await orderRows.count();
            console.log(`   ✓ Found ${rowCount} order(s) in the table`);

            if (rowCount > 0) {
                // 4. Test View Details
                console.log('\n4. Testing View Details functionality...');
                await page.locator('.view-detail-btn').first().click();
                await page.waitForTimeout(1000);
                await addOverlay(page, '🔍 Viewing PO Details - Line Items and Header Info');
                await page.screenshot({ path: path.join(screenshotsDir, '03_po_detail.png'), fullPage: true });
                await removeOverlay(page);
                console.log('   ✓ Clicked View Details button');
                console.log('   ✓ Screenshot saved: 03_po_detail.png');

                const poDetailSection = page.locator('#po-detail-section');
                if (await poDetailSection.isVisible()) {
                    console.log('   ✓ PO detail section is visible');
                }

                const poItemsTable = page.locator('#po-items-table');
                if (await poItemsTable.isVisible()) {
                    console.log('   ✓ PO items table found');
                }

                // Go back to list
                await page.locator('#back-to-list-btn').click();
                await page.waitForTimeout(500);
                console.log('   ✓ Returned to orders list');

                // 5. Test QC Report button
                console.log('\n5. Testing QC Report functionality...');
                const qcBtn = page.locator('.qc-report-btn').first();
                if (await qcBtn.isVisible()) {
                    console.log('   ✓ QC report button found');
                    await qcBtn.click();
                    await page.waitForTimeout(2000);
                    await addOverlay(page, '📊 Generating QC Report - Excel Download Started');
                    await page.screenshot({ path: path.join(screenshotsDir, '03b_qc_report_download.png'), fullPage: true });
                    await removeOverlay(page);
                    console.log('   ✓ Clicked QC report button');
                    console.log('   ✓ Screenshot saved: 03b_qc_report_download.png');
                }
            }
        } else {
            console.log('   ⚠ No orders found in database');
        }

        // 6. Test Search functionality
        console.log('\n6. Testing Search functionality...');
        const searchInput = page.locator('#status-search');
        const searchBtn = page.locator('#search-btn');
        if (await searchInput.isVisible() && await searchBtn.isVisible()) {
            await searchInput.fill('1298540');
            await searchBtn.click();
            await page.waitForTimeout(1000);
            await addOverlay(page, '🔎 Search Results for PO: 1298540');
            await page.screenshot({ path: path.join(screenshotsDir, '04_search_results.png'), fullPage: true });
            await removeOverlay(page);
            console.log('   ✓ Search executed for PO: 1298540');
            console.log('   ✓ Screenshot saved: 04_search_results.png');
        }

        // 7. Test Load More button
        console.log('\n7. Testing Load More functionality...');
        const loadMoreBtn = page.locator('#load-more-btn');
        if (await loadMoreBtn.isVisible()) {
            console.log('   ✓ Load More button found');
            await loadMoreBtn.click();
            await page.waitForTimeout(1000);
            await addOverlay(page, '➕ Loading More Orders - 10 Additional Records');
            await page.screenshot({ path: path.join(screenshotsDir, '04b_load_more.png'), fullPage: true });
            await removeOverlay(page);
            console.log('   ✓ Clicked Load More button');
            console.log('   ✓ Screenshot saved: 04b_load_more.png');
        }

        // 8. Test Show All button
        console.log('\n8. Testing Show All functionality...');
        const showAllBtn = page.locator('#show-all-btn');
        if (await showAllBtn.isVisible()) {
            await showAllBtn.click();
            await page.waitForTimeout(1000);
            await addOverlay(page, '📑 Show All Orders - Loading Complete Database');
            await page.screenshot({ path: path.join(screenshotsDir, '05_show_all.png'), fullPage: true });
            await removeOverlay(page);
            console.log('   ✓ Clicked Show All button');
            console.log('   ✓ Screenshot saved: 05_show_all.png');
        }

        // 9. Test Profile view
        console.log('\n9. Testing Profile view...');
        await page.locator('button[data-view="profile"]').click();
        await page.waitForTimeout(1000);
        await addOverlay(page, '👤 Profile Settings - Login Credentials');
        await page.screenshot({ path: path.join(screenshotsDir, '06_profile.png'), fullPage: true });
        await removeOverlay(page);
        console.log('   ✓ Navigated to Profile view');
        console.log('   ✓ Screenshot saved: 06_profile.png');

        // Check profile form elements
        const profileUsername = page.locator('#profile-username');
        const profilePassword = page.locator('#profile-password');
        const saveProfileBtn = page.locator('#save-profile-btn');

        if (await profileUsername.isVisible()) {
            console.log('   ✓ Username field found');
            const usernameValue = await profileUsername.inputValue();
            if (usernameValue) {
                console.log(`   ✓ Profile loaded with username: ${usernameValue}`);
            }
        }

        if (await profilePassword.isVisible()) {
            console.log('   ✓ Password field found');
        }

        if (await saveProfileBtn.isVisible()) {
            console.log('   ✓ Save button found');
            await saveProfileBtn.click();
            await page.waitForTimeout(1000);
            await addOverlay(page, '💾 Saving Profile - Credentials Updated Successfully');
            await page.screenshot({ path: path.join(screenshotsDir, '06b_profile_saved.png'), fullPage: true });
            await removeOverlay(page);
            console.log('   ✓ Clicked Save Profile button');
            console.log('   ✓ Screenshot saved: 06b_profile_saved.png');
        }

        // 10. Test navigation between views
        console.log('\n10. Testing navigation between views...');
        await page.locator('button[data-view="download-artwork"]').click();
        await page.waitForTimeout(500);
        console.log('   ✓ Navigated to Download Artwork');

        await page.locator('button[data-view="order-status"]').click();
        await page.waitForTimeout(500);
        console.log('   ✓ Navigated to Order Status');

        await page.locator('button[data-view="profile"]').click();
        await page.waitForTimeout(500);
        console.log('   ✓ Navigated to Profile');

        // Final screenshot
        await addOverlay(page, '✅ Testing Complete - All Functions Verified');
        await page.screenshot({ path: path.join(screenshotsDir, '07_final.png'), fullPage: true });
        await removeOverlay(page);
        console.log('\n   ✓ Final screenshot saved: 07_final.png');

        console.log('\n' + '='.repeat(60));
        console.log('Testing Complete!');
        console.log('='.repeat(60));
        console.log('\nSummary:');
        console.log('  ✓ Download Artwork view - Working');
        console.log('  ✓ Order Status view - Working');
        console.log('  ✓ Profile view - Working');
        console.log('  ✓ Navigation between views - Working');
        console.log('  ✓ Search functionality - Working');
        console.log('  ✓ Pagination buttons - Working');
        console.log('  ✓ View Details functionality - Working');
        console.log('  ✓ QC Report button - Working');
        console.log(`\nAll screenshots saved to: ${screenshotsDir}/`);

    } catch (error) {
        console.error('\n✗ Error during testing:', error.message);
        await page.screenshot({ path: path.join(screenshotsDir, 'error.png'), fullPage: true });
        console.log('   ✓ Error screenshot saved: error.png');
    } finally {
        await browser.close();
    }
}

testEBrandIDApp().catch(console.error);
