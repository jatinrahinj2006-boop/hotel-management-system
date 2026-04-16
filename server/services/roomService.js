/* ═══════════════════════════════════════════════
   ROOM SERVICE — Query & status logic
   ═══════════════════════════════════════════════ */

const db = require('../db');

/**
 * Generate smart tags for rooms based on filtered results
 * @param {Array} rooms - Array of available rooms
 * @returns {Array} Rooms with tags added
 */
function addSmartTags(rooms) {
  if (!rooms || rooms.length === 0) return rooms;

  // Find lowest price for best_value
  const lowestPrice = Math.min(...rooms.map(r => r.price));
  
  // Find highest floor for best_view
  const highestFloor = Math.max(...rooms.map(r => r.floor));

  return rooms.map(room => {
    const tags = [];
    
    // Best value: lowest price in filtered results
    if (room.price === lowestPrice) {
      tags.push('best_value');
    }
    
    // Best view: highest floor available
    if (room.floor === highestFloor) {
      tags.push('best_view');
    }
    
    // Best for couples: suite rooms
    if (room.type === 'suite') {
      tags.push('best_for_couples');
    }

    return { ...room, tags };
  });
}

/**
 * Get rooms available for a given date range.
 * A room is available if NO active booking overlaps [checkin, checkout).
 *
 * @param {Object} filters
 * @param {string} [filters.location]
 * @param {string} [filters.type]
 * @param {string} [filters.checkin]  - ISO date string
 * @param {string} [filters.checkout] - ISO date string
 * @param {Object} options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Items per page
 * @returns {Array} Available rooms with smart tags
 */
function getAvailableRooms({ location, type, checkIn, checkOut, floor } = {}, options = {}) {
  const filters = { location, type, checkIn, checkOut, floor };
  console.log('ROOM SERVICE - getAvailableRooms filters:', filters);
  
  let sql = `
    SELECT r.*
    FROM rooms r
    WHERE 1=1
  `;
  const params = [];

  // Filter by location
  if (location) {
    sql += ' AND r.location = ?';
    params.push(location);
  }

  // Filter by type
  if (type) {
    sql += ' AND r.type = ?';
    params.push(type);
  }

  // Filter by floor
  if (floor) {
    sql += ' AND r.floor = ?';
    params.push(Number(floor));
  }

  // Exclude rooms with overlapping bookings
  if (checkIn && checkOut) {
    sql += `
      AND r.id NOT IN (
        SELECT b.roomId
        FROM bookings b
        WHERE b.status IN ('confirmed', 'checked_in')
          AND b.checkIn < ?
          AND b.checkOut > ?
      )
    `;
    params.push(checkOut, checkIn);
    console.log('Booking conflict check - checkOut:', checkOut, 'checkIn:', checkIn);
  }

  sql += ' ORDER BY r.floor, r.number';

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(options.limit) || 10));
  const offset = (page - 1) * limit;

  sql += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const rooms = db.prepare(sql).all(...params);
  console.log('ROOM SERVICE - Found', rooms.length, 'available rooms matching filters');
  if (rooms.length > 0) {
    console.log('First room sample:', { id: rooms[0].id, number: rooms[0].number, type: rooms[0].type, floor: rooms[0].floor });
  }
  
  // Apply smart tags based on filtered results
  return addSmartTags(rooms);
}

/**
 * Get ALL rooms with their current status (admin view) with pagination, search and filters.
 * @param {Object} options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Items per page
 * @param {string} options.search - Search by room number (partial match)
 * @param {string} options.status - Filter by room status
 * @returns {Object} { data, total, page, totalPages }
 */
function getAllRooms(options = {}) {
  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(options.limit) || 10));
  const offset = (page - 1) * limit;
  const search = options.search ? options.search.toString().trim() : '';
  const statusFilter = options.status ? options.status.toString().trim() : '';

  // Build WHERE clause for filters
  let whereClause = 'WHERE 1=1';
  let countParams = [];
  let dataParams = [];

  // Search by room number (partial match)
  if (search) {
    whereClause += ' AND r.number LIKE ?';
    countParams.push(`%${search}%`);
    dataParams.push(`%${search}%`);
  }

  // Filter by status
  if (statusFilter && ['available', 'reserved', 'occupied', 'needs_cleaning'].includes(statusFilter)) {
    whereClause += ' AND r.status = ?';
    countParams.push(statusFilter);
    dataParams.push(statusFilter);
  }

  // Get total count with filters
  const countSql = `
    SELECT COUNT(*) as count 
    FROM rooms r
    ${whereClause}
  `;
  const total = db.prepare(countSql).get(...countParams).count;
  const totalPages = Math.ceil(total / limit);

  // Get paginated rooms with filters
  const dataSql = `
    SELECT r.*,
      (SELECT COUNT(*) FROM bookings b
       WHERE b.roomId = r.id
         AND b.status IN ('confirmed', 'checked_in')) AS activeBookings
    FROM rooms r
    ${whereClause}
    ORDER BY 
      CASE WHEN r.status = 'needs_cleaning' THEN 0 ELSE 1 END,
      r.location, r.floor, r.number
    LIMIT ? OFFSET ?
  `;
  const rooms = db.prepare(dataSql).all(...dataParams, limit, offset);

  return {
    data: rooms,
    total,
    page,
    totalPages
  };
}

/**
 * Update room status.
 * @param {number} id
 * @param {string} status
 * @returns {Object} Updated room or null
 */
function updateRoomStatus(id, status) {
  const validStatuses = ['available', 'reserved', 'occupied', 'needs_cleaning'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const result = db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(status, id);

  if (result.changes === 0) return null;

  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
}

module.exports = {
  getAvailableRooms,
  getAllRooms,
  updateRoomStatus,
  addSmartTags,
};
