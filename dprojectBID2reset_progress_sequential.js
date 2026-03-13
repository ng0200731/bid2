// Script to clear all progress and create new sequential records
// Sequence: 1→2→3→4→5→6→7→8 (CS Team → PMC → Material → Production → Cut and Fold → QC → Shipment → Account)

import { initDatabase, saveDatabase } from './database.js';

// Department sequence: 1→2→3→4→5→6→7→8
const departments = [
    'CS Team',       // 1
    'PMC',           // 2
    'Material',      // 3
    'Production',    // 4
    'Cut and Fold',  // 5
    'QC',            // 6
    'Shipment',      // 7
    'Account'        // 8
];

const sampleNotes = [
    'Initial processing',
    'Quality check passed',
    'Ready for next stage',
    'Awaiting materials',
    'In progress',
    'Completed successfully',
    'Minor adjustments needed',
    'Approved',
    null,
    null
];

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function resetProgressSequential() {
    try {
        console.log('Initializing database...');
        const db = await initDatabase();
        
        // Step 1: Clear all existing progress records
        console.log('\n=== Step 1: Clearing all progress records ===');
        db.run('DELETE FROM progress_tracking');
        saveDatabase();
        console.log('✓ All progress records cleared\n');
        
        // Step 2: Get all POs
        console.log('=== Step 2: Fetching POs ===');
        const stmt = db.prepare('SELECT po_number FROM po_headers ORDER BY created_at DESC LIMIT 50');
        const pos = [];
        while (stmt.step()) {
            pos.push(stmt.getAsObject());
        }
        stmt.free();
        
        if (pos.length === 0) {
            console.log('No POs found in database. Please add some POs first.');
            return;
        }
        
        console.log(`Found ${pos.length} POs\n`);
        
        // Step 3: Create sequential progress for each PO
        console.log('=== Step 3: Creating sequential progress ===\n');
        let recordsCreated = 0;
        
        for (const po of pos) {
            // Random number of departments: 1 to 8
            const numDepts = getRandomInt(1, 8);
            
            console.log(`PO ${po.po_number}: Creating ${numDepts} sequential scans`);
            
            // Create scans in sequence (1→2→3→...→numDepts)
            for (let i = 0; i < numDepts; i++) {
                const department = departments[i];
                const notes = getRandomElement(sampleNotes);
                
                // Create timestamp with small increments to ensure proper ordering
                const timestamp = new Date(Date.now() + (recordsCreated * 1000)).toISOString();
                
                const insertStmt = db.prepare(`
                    INSERT INTO progress_tracking (po_number, department, scanned_at, notes)
                    VALUES (?, ?, ?, ?)
                `);
                
                insertStmt.run([po.po_number, department, timestamp, notes]);
                insertStmt.free();
                
                recordsCreated++;
                console.log(`  ✓ ${i + 1}/${numDepts}: ${department}`);
            }
            
            // Update PO status to the last department scanned
            const lastDept = departments[numDepts - 1];
            const updateStmt = db.prepare(`
                UPDATE po_headers
                SET po_status = ?, updated_at = ?
                WHERE po_number = ?
            `);
            updateStmt.run([lastDept, new Date().toISOString(), po.po_number]);
            updateStmt.free();
            
            console.log('');
        }
        
        saveDatabase();
        
        console.log('\n=== Summary ===');
        console.log(`✓ Successfully created ${recordsCreated} sequential progress records!`);
        console.log(`✓ Processed ${pos.length} POs`);
        console.log(`✓ Each PO has 1-8 departments in order (no repeats)`);
        console.log(`✓ Sequence: CS Team → PMC → Material → Production → Cut and Fold → QC → Shipment → Account`);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
    }
}

resetProgressSequential();
