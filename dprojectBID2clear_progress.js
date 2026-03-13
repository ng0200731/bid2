// Script to clear all progress tracking records

import { initDatabase, saveDatabase } from './database.js';

async function clearProgress() {
    try {
        console.log('Initializing database...');
        const db = await initDatabase();
        
        console.log('Clearing all progress_tracking records...');
        db.run('DELETE FROM progress_tracking');
        
        saveDatabase();
        
        console.log('✓ All progress records cleared successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

clearProgress();
