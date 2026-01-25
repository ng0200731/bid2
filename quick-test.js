import EBrandIDDownloader from './index.js';

async function quickTest() {
  const downloader = new EBrandIDDownloader();

  try {
    console.log('Starting quick test...\n');

    await downloader.initialize();
    console.log('✓ Browser initialized');

    await downloader.login();
    console.log('✓ Login successful');

    await downloader.navigateToPO('1303061');
    console.log('✓ Navigated to PO');

    const items = await downloader.getItemLinks();
    console.log(`✓ Found ${items.length} items`);

    if (items.length > 0) {
      console.log('\nTesting download for first item only...');
      const result = await downloader.downloadItemArtwork(items[0], '1303061');

      if (result.success) {
        console.log('\n✓ Download test successful!');
        console.log(`  File: ${result.filename}`);
        console.log(`  Size: ${(result.size / 1024).toFixed(2)} KB`);
      } else {
        console.log('\n✗ Download test failed');
        console.log(`  Reason: ${result.reason}`);
      }
    }

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await downloader.close();
    console.log('\nTest complete');
  }
}

quickTest();
