import pkg from 'better-sqlite3';
const Database = pkg.default || pkg;

const db = new Database('ebrandid.db');

console.log('Checking progress_tracking for PO 1311571:\n');

const stmt = db.prepare(`
  SELECT id, po_number, department, scanned_at, notes
  FROM progress_tracking
  WHERE po_number = '1311571'
  ORDER BY scanned_at ASC
`);

const results = stmt.all();

console.log(`Found ${results.length} records:\n`);

results.forEach((row, index) => {
  console.log(`${index + 1}. ID: ${row.id}`);
  console.log(`   Department: ${row.department}`);
  console.log(`   Scanned At: ${row.scanned_at}`);
  console.log(`   Notes: ${row.notes || '(none)'}`);
  console.log('');
});

db.close();
