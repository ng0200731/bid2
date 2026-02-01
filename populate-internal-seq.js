import { initDatabase, saveDatabase } from './database.js';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'ebrandid.db');

/**
 * Script to populate internal_seq for all existing items
 */
async function populateInternalSeq() {
  console.log('Starting to populate internal_seq for all items...');

  try {
    // Initialize the database
    console.log('Initializing database...');
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);
    console.log('Database initialized successfully.');

    // Get all items without internal_seq
    const stmt = db.prepare(`
      SELECT id, item_1, suffix
      FROM items
      WHERE internal_seq IS NULL
      ORDER BY id ASC
    `);

    const items = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject());
    }
    stmt.free();

    if (items.length === 0) {
      console.log('All items already have internal_seq assigned.');
      db.close();
      return;
    }

    console.log(`Found ${items.length} items without internal_seq. Assigning sequential numbers...`);

    let successCount = 0;
    let errorCount = 0;

    // Assign sequential numbers starting from ITEM0000001
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const seqNum = i + 1;
      const internal_seq = `ITEM${String(seqNum).padStart(7, '0')}`;

      try {
        const updateStmt = db.prepare(`
          UPDATE items
          SET internal_seq = ?
          WHERE id = ?
        `);

        updateStmt.run([internal_seq, item.id]);
        updateStmt.free();

        successCount++;
        console.log(`✓ [${i + 1}/${items.length}] Assigned ${internal_seq} to item: ${item.item_1}${item.suffix ? '-' + item.suffix : ''}`);
      } catch (error) {
        errorCount++;
        console.error(`✗ [${i + 1}/${items.length}] Error assigning internal_seq to item ${item.id}:`, error.message);
      }
    }

    // Save database to disk
    console.log('\nSaving database...');
    const data = db.export();
    const bufferOut = Buffer.from(data);
    fs.writeFileSync(DB_PATH, bufferOut);
    console.log('Database saved successfully.');

    db.close();

    console.log('\n=== Summary ===');
    console.log(`Total items processed: ${items.length}`);
    console.log(`Successfully assigned: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('Done!');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
populateInternalSeq();
