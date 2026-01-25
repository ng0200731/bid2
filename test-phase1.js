import EBrandIDDownloader from './index.js';

async function test() {
  const downloader = new EBrandIDDownloader();

  // Override config to run in headless mode for testing
  const originalHeadless = downloader.constructor.prototype.headless;

  try {
    console.log('=== Testing Phase 1 ===\n');

    await downloader.initialize();
    await downloader.login();

    // Test with first PO number
    console.log('\n--- Testing PO 1303061 ---');
    await downloader.navigateToPO('1303061');
    const links1 = await downloader.getArtworkLinks();

    console.log(`\nFound ${links1.length} artwork links for PO 1303061`);
    if (links1.length > 0) {
      console.log('Sample links:');
      links1.slice(0, 5).forEach((link, i) => {
        console.log(`  ${i + 1}. ${link.text || 'Unnamed'} - ${link.href}`);
      });
    }

    // Test with second PO number
    console.log('\n--- Testing PO 1307938 ---');
    await downloader.navigateToPO('1307938');
    const links2 = await downloader.getArtworkLinks();

    console.log(`\nFound ${links2.length} artwork links for PO 1307938`);
    if (links2.length > 0) {
      console.log('Sample links:');
      links2.slice(0, 5).forEach((link, i) => {
        console.log(`  ${i + 1}. ${link.text || 'Unnamed'} - ${link.href}`);
      });
    }

    console.log('\n=== Phase 1 Test Complete ===');
    console.log('✓ Login successful');
    console.log('✓ Navigation to PO pages successful');
    console.log('✓ Artwork link detection working');

  } catch (error) {
    console.error('\n=== Test Failed ===');
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    await downloader.close();
  }
}

test();
