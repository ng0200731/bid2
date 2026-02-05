import Database from 'better-sqlite3';

const db = new Database('ebrandid.db');

// Check for duplicate PO numbers
const duplicates = db.prepare(`
  SELECT po_number, COUNT(*) as count, GROUP_CONCAT(created_at) as dates
  FROM po_headers
  GROUP BY po_number
  HAVING count > 1
`).all();

console.log('Duplicate PO numbers found:', duplicates.length);
if (duplicates.length > 0) {
  console.log('\nDuplicates:');
  duplicates.forEach(dup => {
    console.log(`  PO: ${dup.po_number}, Count: ${dup.count}`);
    console.log(`  Dates: ${dup.dates}`);
  });
}

db.close();
