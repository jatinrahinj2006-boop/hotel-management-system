/* ═══════════════════════════════════════════════
   DATABASE LAYER — SQLite via better-sqlite3
   ═══════════════════════════════════════════════ */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'hotel.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ─── SCHEMA ─── */
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    number    TEXT    NOT NULL UNIQUE,
    type      TEXT    NOT NULL CHECK(type IN ('deluxe', 'suite', 'penthouse')),
    location  TEXT    NOT NULL,
    floor     INTEGER NOT NULL,
    price     INTEGER NOT NULL,
    status    TEXT    NOT NULL DEFAULT 'available'
              CHECK(status IN ('available', 'reserved', 'occupied', 'needs_cleaning'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    roomId    INTEGER NOT NULL,
    checkIn   TEXT    NOT NULL,
    checkOut  TEXT    NOT NULL,
    status    TEXT    NOT NULL DEFAULT 'confirmed'
              CHECK(status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled')),
    createdAt TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (roomId) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    email     TEXT    NOT NULL UNIQUE,
    phone     TEXT    NOT NULL,
    password  TEXT    NOT NULL,
    createdAt TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_dates
    ON bookings(checkIn, checkOut);
  CREATE INDEX IF NOT EXISTS idx_bookings_room
    ON bookings(roomId);
  CREATE INDEX IF NOT EXISTS idx_rooms_location_type
    ON rooms(location, type);
`);

/* ─── MIGRATIONS ─── */
const migrateRooms = () => {
    // Check if price column exists
    const tableInfo = db.prepare("PRAGMA table_info(rooms)").all();
    const hasPriceColumn = tableInfo.some(col => col.name === 'price');
    
    if (!hasPriceColumn) {
        // Add price column
        db.exec('ALTER TABLE rooms ADD COLUMN price INTEGER NOT NULL DEFAULT 450');
        
        // Update existing rooms with appropriate prices
        db.exec(`
            UPDATE rooms SET price = 450 WHERE type = 'deluxe';
            UPDATE rooms SET price = 850 WHERE type = 'suite'; 
            UPDATE rooms SET price = 1800 WHERE type = 'penthouse';
        `);
        console.log('✓ Added price column to existing rooms');
    }
};

const migrateBookings = () => {
    // Check if userId column exists in bookings
    const tableInfo = db.prepare("PRAGMA table_info(bookings)").all();
    const hasUserIdColumn = tableInfo.some(col => col.name === 'userId');
    
    if (!hasUserIdColumn) {
        // Add userId column (nullable for backward compatibility)
        db.exec('ALTER TABLE bookings ADD COLUMN userId INTEGER REFERENCES users(id)');
        console.log('✓ Added userId column to bookings table');
    }
};

migrateRooms();
migrateBookings();

/* ─── SEED DATA ─── */
const seedRooms = () => {
    const count = db.prepare('SELECT COUNT(*) AS c FROM rooms').get().c;
    if (count > 0) return; // Already seeded

    const locations = [
        { code: 'paris', name: 'Paris, France' },
        { code: 'tokyo', name: 'Tokyo, Japan' },
        { code: 'dubai', name: 'Dubai, UAE' },
        { code: 'maldives', name: 'Maldives' },
        { code: 'newyork', name: 'New York, USA' },
    ];

    const types = [
        { type: 'deluxe', floors: [2, 3], price: 450 },
        { type: 'suite', floors: [4, 5], price: 850 },
        { type: 'penthouse', floors: [6], price: 1800 },
    ];

    const insert = db.prepare(
        'INSERT INTO rooms (number, type, location, floor, price, status) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const insertAll = db.transaction(() => {
        let roomNum = 100;
        for (const loc of locations) {
            for (const t of types) {
                const floor = t.floors[Math.floor(Math.random() * t.floors.length)];
                roomNum += 1;
                insert.run(`${floor}${String(roomNum).slice(-2)}`, t.type, loc.code, floor, t.price, 'available');
            }
        }
    });

    insertAll();
    console.log('✓ Seeded 15 rooms across 5 locations');
};

seedRooms();

// Add penthouse rooms if they don't exist (migration for existing databases)
const addPenthouseRooms = () => {
    const penthouseCount = db.prepare("SELECT COUNT(*) AS c FROM rooms WHERE type = 'penthouse'").get().c;
    if (penthouseCount > 0) return; // Already have penthouse rooms

    const locations = [
        { code: 'paris', name: 'Paris, France' },
        { code: 'tokyo', name: 'Tokyo, Japan' },
        { code: 'dubai', name: 'Dubai, UAE' },
        { code: 'maldives', name: 'Maldives' },
        { code: 'newyork', name: 'New York, USA' },
    ];

    const insert = db.prepare(
        'INSERT INTO rooms (number, type, location, floor, price, status) VALUES (?, ?, ?, ?, ?, ?)'
    );

    // Find max room number to avoid conflicts
    const maxNum = db.prepare('SELECT MAX(CAST(number AS INTEGER)) as maxNum FROM rooms').get().maxNum || 100;
    let roomNum = maxNum;

    for (const loc of locations) {
        roomNum += 1;
        insert.run(`6${String(roomNum).slice(-2)}`, 'penthouse', loc.code, 6, 1800, 'available');
    }

    console.log('✓ Added 5 penthouse rooms across 5 locations');
};

addPenthouseRooms();

module.exports = db;
