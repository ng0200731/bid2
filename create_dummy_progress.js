// Script to create 50 dummy progress records via API

const API_URL = 'http://localhost:8766';

async function createDummyProgress() {
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

        const departments = [
            'CS Team',
            'PMC',
            'Material',
            'Production',
            'Cut and Fold',
            'QC',
            'Shipment',
            'Account'
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

        // Function to get random element from array
        function getRandomElement(arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        }

        let recordsCreated = 0;

        // Create 1-5 random scans for each PO
        for (const po of selectedPOs) {
            const numScans = Math.floor(Math.random() * 5) + 1; // 1 to 5 scans per PO

            for (let i = 0; i < numScans; i++) {
                const department = getRandomElement(departments);
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
                        console.log(`Created scan ${recordsCreated}: PO ${po.po_number} - ${department}`);
                    } else {
                        const error = await scanResponse.json();
                        console.error(`Error creating record for PO ${po.po_number}: ${error.error}`);
                    }
                } catch (error) {
                    console.error(`Error creating record: ${error.message}`);
                }
            }
        }

        console.log(`\nSuccessfully created ${recordsCreated} dummy progress records for ${selectedPOs.length} POs!`);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

createDummyProgress();
