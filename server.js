import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';
import fs from 'fs';
import os from 'os';
import EBrandIDDownloader from './index.js';
import { initDatabase, getAllPOs, getPOByNumber, getPOItems, searchPOs } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8766;

// Initialize database
await initDatabase();
console.log('Database initialized');

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Store active jobs
const jobs = new Map();
let jobIdCounter = 1;

// Sample quantity calculation based on order quantity
function getSampleQuantity(orderQty) {
  if (orderQty <= 15) return 2;
  if (orderQty <= 25) return 3;
  if (orderQty <= 90) return 5;
  if (orderQty <= 150) return 8;
  if (orderQty <= 280) return 13;
  if (orderQty <= 500) return 20;
  if (orderQty <= 1200) return 32;
  if (orderQty <= 3200) return 50;
  if (orderQty <= 10000) return 80;
  if (orderQty <= 35000) return 125;
  if (orderQty <= 150000) return 200;
  if (orderQty <= 500000) return 315;
  return 500;
}

// API Routes

// Start download job
app.post('/api/download', async (req, res) => {
  const { poNumbers } = req.body;

  if (!poNumbers || !Array.isArray(poNumbers) || poNumbers.length === 0) {
    return res.status(400).json({ error: 'Invalid PO numbers' });
  }

  const jobId = `job_${jobIdCounter++}`;

  // Create job entry
  jobs.set(jobId, {
    id: jobId,
    status: 'processing',
    poNumbers: poNumbers,
    results: [],
    currentPO: null,
    progress: null,
    startTime: new Date()
  });

  // Start download process in background
  processDownload(jobId, poNumbers);

  res.json({ jobId, status: 'started' });
});

// Get job status
app.get('/api/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    jobId: job.id,
    status: job.status,
    currentPO: job.currentPO,
    progress: job.progress,
    results: job.results,
    error: job.error
  });
});

// Get download history
app.get('/api/downloads', (req, res) => {
  const allJobs = Array.from(jobs.values()).map(job => ({
    jobId: job.id,
    status: job.status,
    poNumbers: job.poNumbers,
    startTime: job.startTime,
    completedTime: job.completedTime,
    totalFiles: job.results.reduce((sum, r) => sum + (r.filesDownloaded || 0), 0)
  }));

  res.json(allJobs);
});

// Get files for specific PO
app.get('/api/downloads/:poNumber', (req, res) => {
  const { poNumber } = req.params;

  // Find all jobs that processed this PO
  const relevantJobs = Array.from(jobs.values())
    .filter(job => job.results.some(r => r.poNumber === poNumber));

  if (relevantJobs.length === 0) {
    return res.status(404).json({ error: 'PO not found' });
  }

  // Get the most recent result for this PO
  const latestJob = relevantJobs[relevantJobs.length - 1];
  const poResult = latestJob.results.find(r => r.poNumber === poNumber);

  res.json(poResult);
});

// Get all POs from database with optional pagination
app.get('/api/orders', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    const orders = getAllPOs(limit, offset);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific PO details
app.get('/api/orders/:poNumber', (req, res) => {
  try {
    const { poNumber } = req.params;
    const po = getPOByNumber(poNumber);

    if (!po) {
      return res.status(404).json({ error: 'PO not found' });
    }

    const items = getPOItems(poNumber);
    res.json({ ...po, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search POs
app.get('/api/orders/search/:term', (req, res) => {
  try {
    const { term } = req.params;
    const results = searchPOs(term);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get profile (username and password)
app.get('/api/profile', (req, res) => {
  try {
    const configPath = path.join(__dirname, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    res.json({
      username: config.username || '',
      password: config.password || ''
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update profile (username and password)
app.post('/api/profile', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const configPath = path.join(__dirname, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Update credentials
    config.username = username;
    config.password = password;

    // Write back to config.json
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate QC report
app.get('/api/qc-report/:poNumber', (req, res) => {
  try {
    const { poNumber } = req.params;

    // Get PO header and items from database
    const po = getPOByNumber(poNumber);
    if (!po) {
      return res.status(404).json({ error: 'PO not found' });
    }

    const items = getPOItems(poNumber);
    if (!items || items.length === 0) {
      return res.status(404).json({ error: 'No items found for this PO' });
    }

    // Create workbook
    const wb = xlsx.utils.book_new();

    // Prepare data for Excel
    const data = [
      ['WO#', 'ITEM NO.', 'ORDER QUANTITY (PCS)', 'NUMBER OF SAMPLE (PCS)', 'PASSED QUANTITY (PCS)', 'REJECTED QUANTITY (PCS)']
    ];

    // Add each item
    items.forEach(item => {
      // Parse quantity (handle comma-separated numbers like "1,458")
      const qtyStr = String(item.qty || 0);
      const orderQty = parseInt(qtyStr.replace(/,/g, ''));

      // Calculate sample quantity
      const sampleQty = getSampleQuantity(orderQty);

      // Default: all samples pass, no rejections
      const passedQty = sampleQty;
      const rejectedQty = 0;

      data.push([
        poNumber,
        item.item_number || item.description || '',
        orderQty,
        sampleQty,
        passedQty,
        rejectedQty
      ]);
    });

    // Create worksheet
    const ws = xlsx.utils.aoa_to_sheet(data);

    // Set column widths
    const colWidths = [
      { wch: 15 },  // WO#
      { wch: 25 },  // ITEM NO.
      { wch: 25 },  // ORDER QUANTITY
      { wch: 25 },  // NUMBER OF SAMPLE
      { wch: 25 },  // PASSED QUANTITY
      { wch: 25 }   // REJECTED QUANTITY
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(wb, ws, 'QC Report');

    // Generate filename
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `${currentDate}-${poNumber}-qc.xlsx`;

    // Create report directory if it doesn't exist
    const reportDir = path.join(__dirname, 'report', 'qc_report');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Write file
    const filepath = path.join(reportDir, filename);
    xlsx.writeFile(wb, filepath);

    // Send file to client
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ error: 'Failed to send file' });
      }
    });

  } catch (error) {
    console.error('Error generating QC report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Background download processor
async function processDownload(jobId, poNumbers) {
  const job = jobs.get(jobId);
  const downloader = new EBrandIDDownloader();

  try {
    // Initialize and login
    job.progress = 'Initializing browser...';
    await downloader.initialize();

    job.progress = 'Logging in...';
    await downloader.login();

    // Process each PO
    for (const poNumber of poNumbers) {
      job.currentPO = poNumber;
      job.progress = `Processing PO ${poNumber}...`;

      const result = await downloader.downloadPOArtwork(poNumber);
      job.results.push(result);
    }

    // Mark as completed
    job.status = 'completed';
    job.completedTime = new Date();
    job.currentPO = null;
    job.progress = 'All downloads completed';

  } catch (error) {
    console.error('Download error:', error);
    job.status = 'failed';
    job.error = error.message;
    job.completedTime = new Date();
  } finally {
    await downloader.close();
  }
}

// Get local IP address for network access
function getLocalIPAddress() {
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Start server with automatic port fallback
function startServer(port, maxAttempts = 10) {
  const server = app.listen(port, '0.0.0.0', async () => {
    const localIP = await getLocalIPAddress();
    console.log(`\n${'='.repeat(60)}`);
    console.log('E-BrandID Web Server is running!');
    console.log(`${'='.repeat(60)}`);
    console.log(`\nLocal access:    http://localhost:${port}`);
    console.log(`Network access:  http://${localIP}:${port}`);
    console.log(`\nShare the network URL with other users on your network.`);
    console.log(`${'='.repeat(60)}\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is already in use, trying port ${port + 1}...`);
      if (maxAttempts > 1) {
        startServer(port + 1, maxAttempts - 1);
      } else {
        console.error('Could not find an available port after multiple attempts');
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer(PORT);
