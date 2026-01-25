import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'ebrandid.db');

let SQL;
let db;

/**
 * Initialize the database
 */
export async function initDatabase() {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    createTables();
    saveDatabase();
  }

  return db;
}

/**
 * Create database tables
 */
function createTables() {
  // PO Headers table
  db.run(`
    CREATE TABLE IF NOT EXISTS po_headers (
      po_number TEXT PRIMARY KEY,
      status TEXT,
      company TEXT,
      currency TEXT,
      terms TEXT,
      vendor_name TEXT,
      vendor_address1 TEXT,
      vendor_address2 TEXT,
      vendor_address3 TEXT,
      ship_to_name TEXT,
      ship_to_address1 TEXT,
      ship_to_address2 TEXT,
      ship_to_address3 TEXT,
      cancel_date TEXT,
      total_amount REAL,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // PO Line Items table
  db.run(`
    CREATE TABLE IF NOT EXISTS po_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT,
      item_number TEXT,
      description TEXT,
      color TEXT,
      ship_to TEXT,
      need_by TEXT,
      qty INTEGER,
      bundle_qty TEXT,
      unit_price REAL,
      extension REAL,
      FOREIGN KEY (po_number) REFERENCES po_headers(po_number)
    )
  `);

  // Download history table
  db.run(`
    CREATE TABLE IF NOT EXISTS download_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT,
      files_downloaded INTEGER,
      total_size INTEGER,
      download_date TEXT,
      status TEXT,
      FOREIGN KEY (po_number) REFERENCES po_headers(po_number)
    )
  `);
}

/**
 * Save database to disk
 */
export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

/**
 * Insert or update PO header
 */
export function savePOHeader(poData) {
  try {
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO po_headers (
        po_number, status, company, currency, terms,
        vendor_name, vendor_address1, vendor_address2, vendor_address3,
        ship_to_name, ship_to_address1, ship_to_address2, ship_to_address3,
        cancel_date, total_amount, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      poData.poNumber,
      poData.status,
      poData.company,
      poData.currency,
      poData.terms,
      poData.vendorName,
      poData.vendorAddress1,
      poData.vendorAddress2,
      poData.vendorAddress3,
      poData.shipToName,
      poData.shipToAddress1,
      poData.shipToAddress2,
      poData.shipToAddress3,
      poData.cancelDate,
      poData.totalAmount,
      now,
      now
    ]);

    stmt.free();
    saveDatabase();
  } catch (error) {
    console.error('Error in savePOHeader:', error);
    console.error('PO Data:', JSON.stringify(poData, null, 2));
    throw new Error(`Failed to save PO header: ${error.message || error.toString()}`);
  }
}

/**
 * Insert PO line item
 */
export function savePOItem(itemData) {
  const stmt = db.prepare(`
    INSERT INTO po_items (
      po_number, item_number, description, color, ship_to,
      need_by, qty, bundle_qty, unit_price, extension
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run([
    itemData.poNumber,
    itemData.itemNumber,
    itemData.description,
    itemData.color,
    itemData.shipTo,
    itemData.needBy,
    itemData.qty,
    itemData.bundleQty,
    itemData.unitPrice,
    itemData.extension
  ]);

  stmt.free();
  saveDatabase();
}

/**
 * Save download history
 */
export function saveDownloadHistory(historyData) {
  const stmt = db.prepare(`
    INSERT INTO download_history (
      po_number, files_downloaded, total_size, download_date, status
    ) VALUES (?, ?, ?, datetime('now'), ?)
  `);

  stmt.run([
    historyData.poNumber,
    historyData.filesDownloaded,
    historyData.totalSize,
    historyData.status
  ]);

  stmt.free();
  saveDatabase();
}

/**
 * Get all PO headers
 */
export function getAllPOs() {
  const stmt = db.prepare('SELECT * FROM po_headers ORDER BY updated_at DESC');
  const results = [];

  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }

  stmt.free();
  return results;
}

/**
 * Get PO by number
 */
export function getPOByNumber(poNumber) {
  const stmt = db.prepare('SELECT * FROM po_headers WHERE po_number = ?');
  stmt.bind([poNumber]);

  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }

  stmt.free();
  return result;
}

/**
 * Get PO items by PO number
 */
export function getPOItems(poNumber) {
  const stmt = db.prepare('SELECT * FROM po_items WHERE po_number = ? ORDER BY id');
  stmt.bind([poNumber]);

  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }

  stmt.free();
  return results;
}

/**
 * Get download history for a PO
 */
export function getDownloadHistory(poNumber) {
  const stmt = db.prepare('SELECT * FROM download_history WHERE po_number = ? ORDER BY download_date DESC');
  stmt.bind([poNumber]);

  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }

  stmt.free();
  return results;
}

/**
 * Search POs
 */
export function searchPOs(searchTerm) {
  const stmt = db.prepare(`
    SELECT * FROM po_headers
    WHERE po_number LIKE ?
       OR vendor_name LIKE ?
       OR status LIKE ?
    ORDER BY updated_at DESC
  `);

  const term = `%${searchTerm}%`;
  stmt.bind([term, term, term]);

  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }

  stmt.free();
  return results;
}

/**
 * Close database
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
