import { db, saveDatabase } from './database.js';

console.log('Checking for duplicate PO numbers...\n');

// Find duplicates
const duplicates = db.prepare(`
  SELECT po_number, COUNT(*) as count
  FROM po_headers
  GROUP BY po_number
  HAVING count > 1
`).all();

console.log(`Found ${duplicates.length} PO numbers with duplicates\n`);

if (duplicates.length > 0) {
  console.log('Cleaning up duplicates (keeping oldest record)...\n');

  duplicates.forEach(dup => {
    console.log(`Processing PO: ${dup.po_number} (${dup.count} duplicates)`);

    // Get all records for this PO, ordered by created_at (keep the oldest)
    const records = db.prepare(`
      SELECT rowid, created_at
      FROM po_headers
      WHERE po_number = ?
      ORDER BY created_at ASC
    `).all(dup.po_number);

    // Keep the first (oldest) record, delete the rest
    const toDelete = records.slice(1);

    toDelete.forEach(record => {
      // Delete the duplicate header
      db.prepare('DELETE FROM po_headers WHERE rowid = ?').run(record.rowid);
      console.log(`  ✓ Deleted duplicate (created: ${record.created_at})`);
    });

    console.log(`  ✓ Kept oldest record (created: ${records[0].created_at})\n`);
  });

  saveDatabase();
  console.log('Cleanup complete!\n');

  // Verify
  const remaining = db.prepare(`
    SELECT po_number, COUNT(*) as count
    FROM po_headers
    GROUP BY po_number
    HAVING count > 1
  `).all();

  if (remaining.length === 0) {
    console.log('✓ No duplicates remaining');
  } else {
    console.log(`✗ Still have ${remaining.length} duplicates`);
  }
} else {
  console.log('✓ No duplicates found');
}
