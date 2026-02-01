import { initDatabase, getAllItems, saveItemDetails } from './database.js';

/**
 * Script to automatically fill in details for all items in the database
 */
async function fillAllItemDetails() {
  console.log('Starting to fill details for all items...');

  try {
    // Initialize the database first
    console.log('Initializing database...');
    await initDatabase();
    console.log('Database initialized successfully.');

    // Get all items from the database
    const items = getAllItems();

    if (!items || items.length === 0) {
      console.log('No items found in database.');
      return;
    }

    console.log(`Found ${items.length} items. Processing...`);

    let successCount = 0;
    let errorCount = 0;

    // Process each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemNumber = item.suffix ? `${item.item_1}-${item.suffix}` : item.item_1;

      try {
        // Create dummy data for this item
        const detailsData = {
          item_1: item.item_1,
          suffix: item.suffix || null,
          brand_name: 'Sample Brand',
          machine_number: `M-${String(i + 1).padStart(3, '0')}`,
          machine_opening: '48',
          pattern_name: `Pattern ${itemNumber}`,
          pattern_writer: 'John Doe',
          dragon_head: `DH-${String(i + 1).padStart(3, '0')}`,
          machine_density: '25.5',
          pattern_density: '26.0',
          total_length_mm: '1200',
          skirt_opening: '300',
          actual_length: '1180',
          width_mm: '150',
          x_coordinate: '100',
          y_coordinate: '200',
          picks: '3000',
          cut_per_group: '10',
          total_cut: '100',
          total_assembly: '95',
          schedule_progress: 'In Progress',
          actual_cut: '98'
        };

        // Save the details
        saveItemDetails(detailsData);
        successCount++;
        console.log(`✓ [${i + 1}/${items.length}] Saved details for item: ${itemNumber}`);

      } catch (error) {
        errorCount++;
        console.error(`✗ [${i + 1}/${items.length}] Error saving details for item ${itemNumber}:`, error.message);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total items: ${items.length}`);
    console.log(`Successfully saved: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('Done!');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
fillAllItemDetails();
