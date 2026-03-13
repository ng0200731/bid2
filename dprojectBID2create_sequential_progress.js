// Script to create sequential progress records (1-8 departments in order, no repeats)

const API_URL = 'http://localhost:8766';

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

async function clearExistingProgress() {
    try {
        console.log('Clearing existing progress records...');
        // We'll need to add an API endpoint to clear progress, or we can skip this
        console.log('Note: You may want to manually clear progress_tracking table first');
    } catch (error) {
        console.error('Error clearing progress:', error.message);
    }
}

async function createSequentialProgress() {
    try {
        // Fetch all POs
        const response = await fetch(`${API_URL}/api/orders`);
        const pos = await response.json();

        if (!pos || pos.length === 0) {
            console.log('No POs found in database. Please add some POs first.');
            return;
        }

        // Take first 50 POs
        const selectedPOs = pos.slice(0, 50);
        let recordsCreated = 0;

        console.log(`\nCreating sequential progress for ${selectedPOs.length} POs...\n`);

        // For each PO, create 1-8 sequential scans (no repeats, in order)
        for (const po of selectedPOs) {
            // Random number of departments: 1 to 8
            const numDepts = getRandomInt(1, 8);
            
            console.log(`PO ${po.po_number}: Creating ${numDepts} sequential scans`);

            // Create scans in sequence (1→2→3→...→numDepts)
            for (let i = 0; i < numDepts; i++) {
                const department = departments[i];
                const notes = getRandomElement(sampleNotes);

                try {
                    const scanResponse = await fetch(`${API_URL}/api/progress/scan`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            poNumber: po.po_number,
                            department: department,
                            notes: notes
                        })
                    });

                    if (scanResponse.ok) {
                        recordsCreated++;
                        console.log(`  ✓ ${i + 1}/${numDepts}: ${department}`);
                    } else {
                        const error = await scanResponse.json();
                        console.error(`  ✗ Error: ${error.error}`);
                    }

                    // Small delay to ensure proper timestamp ordering
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                    console.error(`  ✗ Error: ${error.message}`);
                }
            }
            
            console.log('');
        }

        console.log(`\n✓ Successfully created ${recordsCreated} sequential progress records!`);
        console.log(`  - Each PO has 1-8 departments in order`);
        console.log(`  - No repeated departments`);
        console.log(`  - Sequence: CS Team → PMC → Material → Production → Cut and Fold → QC → Shipment → Account`);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

createSequentialProgress();
