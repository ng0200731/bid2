import { getProgressByPO } from './database.js';

console.log('Checking progress_tracking for PO 1311571:\n');

const results = getProgressByPO('1311571');

console.log(`Found ${results.length} records:\n`);

results.forEach((row, index) => {
  console.log(`${index + 1}. ID: ${row.id}`);
  console.log(`   Department: ${row.department}`);
  console.log(`   Scanned At: ${row.scanned_at}`);
  console.log(`   Notes: ${row.notes || '(none)'}`);
  console.log('');
});
