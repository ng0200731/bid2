import { db, saveDatabase } from './database.js';

console.log('Removing duplicate PO records...\n');

// Find all PO numbers that have duplicates
const duplicatesQuery = db.prepare(`
  SELECT po_number, COUNT(*) as cnt
  FROM po_headers
  GROUP BY po_number
  HAVING cnt > 1
`);

const duplicates = [];
while (duplicatesQuery.step()) {
  duplicates.push(duplicatesQuery.getAsObject());
}
duplicatesQuery.free();

console.log(`Found ${duplicates.length} PO numbers with duplicates\n`);

if (duplicates.length > 0) {
  duplicates.forEach(dup => {
    console.log(`PO ${dup.po_number}: ${dup.cnt} records`);

    // Get all records for this PO, ordered by created_at (keep newest)
    const recordsQuery = db.prepare(`
      SELECT rowid, created_at
      FROM po_headers
      WHERE po_number = ?
      ORDER BY created_at DESC
    `);
    recordsQuery.bind([dup.po_number]);

    const records = [];
    while (recordsQuery.step()) {
      records.push(recordsQuery.getAsObject());
    }
    recordsQuery.free();

    // Keep the first (newest) record, delete the rest
    const toDelete = records.slice(1);

    toDelete.forEach(record => {
      const deleteStmt = db.prepare('DELETE FROM po_headers WHERE rowid = ?');
      deleteStmt.run([record.rowid]);
      deleteStmt.free();
      console.log(`  Deleted old record (created: ${record.created_at})`);
    });

    console.log(`  Kept newest record (created: ${records[0].created_at})\n`);
  });

  saveDatabase();
  console.log('✓ Cleanup complete!');
} else {
  console.log('✓ No duplicates found');
}
