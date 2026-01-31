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
    // Run migrations for existing databases
    migrateDatabase();
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
      po_date TEXT,
      ship_by TEXT,
      ship_via TEXT,
      order_type TEXT,
      loc TEXT,
      prod_rep TEXT,
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

  // Messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_number TEXT,
      author TEXT,
      received_date TEXT,
      subject TEXT,
      comment TEXT,
      full_details TEXT,
      message_link TEXT,
      comment_id TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // Items tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_1 TEXT NOT NULL,
      suffix TEXT,
      created_at TEXT,
      UNIQUE(item_1, suffix)
    )
  `);
}

/**
 * Migrate existing database to add new columns and tables
 */
function migrateDatabase() {
  try {
    // Check if messages table exists, if not create it
    try {
      db.exec(`SELECT 1 FROM messages LIMIT 1`);
    } catch (error) {
      // Messages table doesn't exist, create it
      console.log('Creating messages table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ref_number TEXT,
          author TEXT,
          received_date TEXT,
          subject TEXT,
          comment TEXT,
          full_details TEXT,
          message_link TEXT,
          comment_id TEXT,
          created_at TEXT,
          updated_at TEXT
        )
      `);
    }

    // Check if new columns exist, if not add them
    const columns = ['po_date', 'ship_by', 'ship_via', 'order_type', 'loc', 'prod_rep'];

    columns.forEach(column => {
      try {
        // Try to select the column to see if it exists
        db.exec(`SELECT ${column} FROM po_headers LIMIT 1`);
      } catch (error) {
        // Column doesn't exist, add it
        console.log(`Adding column ${column} to po_headers table`);
        db.run(`ALTER TABLE po_headers ADD COLUMN ${column} TEXT`);
      }
    });

    // Check if message_link column exists in messages table
    try {
      db.exec(`SELECT message_link FROM messages LIMIT 1`);
    } catch (error) {
      // Column doesn't exist, add it
      console.log('Adding column message_link to messages table');
      db.run(`ALTER TABLE messages ADD COLUMN message_link TEXT`);
    }

    // Check if comment_id column exists in messages table
    try {
      db.exec(`SELECT comment_id FROM messages LIMIT 1`);
    } catch (error) {
      // Column doesn't exist, add it
      console.log('Adding column comment_id to messages table');
      db.run(`ALTER TABLE messages ADD COLUMN comment_id TEXT`);
    }

    // Check if items table exists, if not create it
    try {
      db.exec(`SELECT 1 FROM items LIMIT 1`);
    } catch (error) {
      // Items table doesn't exist, create it
      console.log('Creating items table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_1 TEXT NOT NULL,
          suffix TEXT,
          created_at TEXT,
          UNIQUE(item_1, suffix)
        )
      `);
    }

    saveDatabase();
  } catch (error) {
    console.error('Error during database migration:', error);
  }
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
        cancel_date, total_amount, po_date, ship_by, ship_via, order_type, loc, prod_rep,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      poData.poDate,
      poData.shipBy,
      poData.shipVia,
      poData.orderType,
      poData.loc,
      poData.prodRep,
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

  // Automatically track the item
  trackItem(itemData.itemNumber);

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
 * Get all PO headers with optional pagination
 * @param {number} limit - Maximum number of records to return (optional)
 * @param {number} offset - Number of records to skip (optional)
 */
export function getAllPOs(limit = null, offset = 0) {
  // First get total count to handle offset properly
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM po_headers');
  countStmt.step();
  const totalCount = countStmt.getAsObject().count;
  countStmt.free();

  // If offset is beyond total records, return empty array
  if (offset >= totalCount) {
    return [];
  }

  let query = 'SELECT * FROM po_headers ORDER BY created_at DESC';

  if (limit !== null) {
    query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
  }

  const stmt = db.prepare(query);
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
 * Delete PO and all related data
 */
export function deletePO(poNumber) {
  try {
    // Delete PO items first (foreign key constraint)
    const itemsStmt = db.prepare('DELETE FROM po_items WHERE po_number = ?');
    itemsStmt.bind([poNumber]);
    itemsStmt.step();
    itemsStmt.free();

    // Delete download history
    const historyStmt = db.prepare('DELETE FROM download_history WHERE po_number = ?');
    historyStmt.bind([poNumber]);
    historyStmt.step();
    historyStmt.free();

    // Delete PO header
    const headerStmt = db.prepare('DELETE FROM po_headers WHERE po_number = ?');
    headerStmt.bind([poNumber]);
    headerStmt.step();
    headerStmt.free();

    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error deleting PO:', error);
    throw new Error(`Failed to delete PO: ${error.message}`);
  }
}

/**
 * Delete all POs and related data
 */
export function deleteAllPOs() {
  try {
    db.run('DELETE FROM po_items');
    db.run('DELETE FROM download_history');
    db.run('DELETE FROM po_headers');
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error deleting all POs:', error);
    throw new Error(`Failed to delete all POs: ${error.message}`);
  }
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

/**
 * Save message to database
 */
export function saveMessage(messageData) {
  try {
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO messages (
        ref_number, author, received_date, subject, comment, full_details, message_link, comment_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      messageData.refNumber,
      messageData.author,
      messageData.receivedDate,
      messageData.subject,
      messageData.comment,
      messageData.fullDetails,
      messageData.messageLink || null,
      messageData.commentId || null,
      now,
      now
    ]);

    stmt.free();
    saveDatabase();
  } catch (error) {
    console.error('Error in saveMessage:', error);
    throw new Error(`Failed to save message: ${error.message}`);
  }
}

/**
 * Get all messages
 */
export function getAllMessages() {
  const stmt = db.prepare('SELECT * FROM messages ORDER BY received_date DESC');
  const results = [];

  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }

  stmt.free();
  return results;
}

/**
 * Delete a single message by ID
 */
export function deleteMessage(id) {
  try {
    const stmt = db.prepare('DELETE FROM messages WHERE id = ?');
    stmt.bind([id]);
    stmt.step();
    stmt.free();
    saveDatabase();
    return { success: true, message: 'Message deleted successfully' };
  } catch (error) {
    console.error('Error deleting message:', error);
    throw new Error(`Failed to delete message: ${error.message}`);
  }
}

/**
 * Delete all messages
 */
export function deleteAllMessages() {
  try {
    db.run('DELETE FROM messages');
    saveDatabase();
    return { success: true, message: 'All messages deleted successfully' };
  } catch (error) {
    console.error('Error deleting all messages:', error);
    throw new Error(`Failed to delete messages: ${error.message}`);
  }
}

/**
 * Track item in items table
 * Splits item number by "-" into prefix (item_1) and suffix
 */
export function trackItem(itemNumber) {
  try {
    if (!itemNumber || itemNumber.trim() === '') {
      return;
    }

    const now = new Date().toISOString();
    let item_1, suffix;

    // Split by "-" to get prefix and suffix
    const parts = itemNumber.split('-');
    if (parts.length > 1) {
      item_1 = parts[0];
      suffix = parts.slice(1).join('-'); // Join remaining parts in case there are multiple "-"
    } else {
      item_1 = itemNumber;
      suffix = null;
    }

    // Insert or ignore if already exists (UNIQUE constraint)
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO items (item_1, suffix, created_at)
      VALUES (?, ?, ?)
    `);

    stmt.run([item_1, suffix, now]);
    stmt.free();
    saveDatabase();
  } catch (error) {
    console.error('Error tracking item:', error);
  }
}

/**
 * Get all items from items table
 */
export function getAllItems() {
  try {
    const stmt = db.prepare(`
      SELECT item_1, suffix, created_at
      FROM items
      ORDER BY created_at DESC
    `);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }

    stmt.free();
    return results;
  } catch (error) {
    console.error('Error getting items:', error);
    return [];
  }
}

/**
 * Rebuild items table from existing po_items
 * This is a one-time operation to populate items from existing data
 */
export function rebuildItemsTable() {
  try {
    // Clear existing items
    db.run('DELETE FROM items');

    // Get all unique item numbers from po_items
    const stmt = db.prepare(`
      SELECT DISTINCT item_number
      FROM po_items
      WHERE item_number IS NOT NULL AND item_number != ''
      ORDER BY item_number
    `);

    const items = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      items.push(row.item_number);
    }
    stmt.free();

    // Track each item
    items.forEach(itemNumber => {
      trackItem(itemNumber);
    });

    return { success: true, message: `Rebuilt items table with ${items.length} items` };
  } catch (error) {
    console.error('Error rebuilding items table:', error);
    throw new Error(`Failed to rebuild items table: ${error.message}`);
  }
}
