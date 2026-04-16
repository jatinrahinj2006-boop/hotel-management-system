/* ═══════════════════════════════════════════════
   ADMIN BOOKING SERVICE — Check-in/out state machine
   Strict validation: booking status + room status must match exactly.
   ═══════════════════════════════════════════════ */

const db = require('../db');
const { triggerNewBooking, triggerCheckout } = require('./notificationService');
const { getAvailableRooms } = require('./roomService');

function getBookingWithRoom(bookingId) {
  return db.prepare(`
    SELECT
      b.id AS bookingId,
      b.roomId AS bookingRoomId,
      b.checkIn,
      b.checkOut,
      b.status AS bookingStatus,
      b.createdAt,
      r.id AS roomId,
      r.number,
      r.type,
      r.location,
      r.floor,
      r.status AS roomStatus
    FROM bookings b
    JOIN rooms r ON r.id = b.roomId
    WHERE b.id = ?
  `).get(bookingId);
}

function toBookingDTO(row) {
  return {
    id: row.bookingId,
    roomId: row.bookingRoomId,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    status: row.bookingStatus,
    createdAt: row.createdAt,
  };
}

function toRoomDTO(row) {
  return {
    id: row.roomId,
    number: row.number,
    type: row.type,
    location: row.location,
    floor: row.floor,
    status: row.roomStatus,
  };
}

function getAllAdminBookings(status = 'active', options = {}) {
  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(options.limit) || 10));
  const offset = (page - 1) * limit;

  let whereClause = '';
  let params = [];

  if (status === 'active') {
    whereClause = "WHERE b.status IN ('confirmed', 'checked_in')";
  } else if (status === 'history') {
    whereClause = "WHERE b.status = 'checked_out'";
  }
  // Default to active if no valid status provided

  // Get total count for pagination
  const countSql = `
    SELECT COUNT(*) as count 
    FROM bookings b
    JOIN rooms r ON r.id = b.roomId
    ${whereClause}
  `;
  const total = db.prepare(countSql).get(...params).count;
  const totalPages = Math.ceil(total / limit);

  const rows = db.prepare(`
    SELECT
      b.id AS bookingId,
      b.roomId AS bookingRoomId,
      b.checkIn,
      b.checkOut,
      b.status AS bookingStatus,
      b.createdAt,
      r.id AS roomId,
      r.number,
      r.type,
      r.location,
      r.floor,
      r.status AS roomStatus
    FROM bookings b
    JOIN rooms r ON r.id = b.roomId
    ${whereClause}
    ORDER BY b.checkIn DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const bookings = rows.map((row) => ({
    booking: toBookingDTO(row),
    room: toRoomDTO(row),
    // Customer table does not exist in current schema; keep UI simple.
    customer: null,
  }));

  // Get counts for both active and history (for tab display)
  const activeCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM bookings 
    WHERE status IN ('confirmed', 'checked_in')
  `).get().count;

  const historyCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM bookings 
    WHERE status = 'checked_out'
  `).get().count;

  return { 
    data: bookings,
    total,
    page,
    totalPages,
    activeCount,
    historyCount
  };
}

function adminCheckIn(bookingId) {
  const row = getBookingWithRoom(bookingId);
  if (!row) return null;

  const expectedBookingStatus = 'confirmed';
  const expectedRoomStatus = 'reserved';

  if (row.bookingStatus !== expectedBookingStatus) {
    const err = new Error('Invalid booking status for check-in');
    err.code = 'INVALID_BOOKING_STATUS';
    err.expected = expectedBookingStatus;
    err.actual = row.bookingStatus;
    throw err;
  }

  if (row.roomStatus !== expectedRoomStatus) {
    const err = new Error('Room status mismatch for check-in');
    err.code = 'ROOM_STATUS_MISMATCH';
    err.expected = expectedRoomStatus;
    err.actual = row.roomStatus;
    throw err;
  }

  return db.transaction(() => {
    db.prepare(`UPDATE bookings SET status = 'checked_in' WHERE id = ?`).run(bookingId);
    db.prepare(`UPDATE rooms SET status = 'occupied' WHERE id = ?`).run(row.roomId);

    const updated = getBookingWithRoom(bookingId);
    return {
      message: 'Check-in successful',
      booking: toBookingDTO(updated),
      room: toRoomDTO(updated),
    };
  })();
}

function adminCheckOut(bookingId) {
  const row = getBookingWithRoom(bookingId);
  if (!row) return null;

  const expectedBookingStatus = 'checked_in';
  const expectedRoomStatus = 'occupied';

  if (row.bookingStatus !== expectedBookingStatus) {
    const err = new Error('Invalid booking status for check-out');
    err.code = 'INVALID_BOOKING_STATUS';
    err.expected = expectedBookingStatus;
    err.actual = row.bookingStatus;
    throw err;
  }

  if (row.roomStatus !== expectedRoomStatus) {
    const err = new Error('Room status mismatch for check-out');
    err.code = 'ROOM_STATUS_MISMATCH';
    err.expected = expectedRoomStatus;
    err.actual = row.roomStatus;
    throw err;
  }

  return db.transaction(() => {
    db.prepare(`UPDATE bookings SET status = 'checked_out' WHERE id = ?`).run(bookingId);
    db.prepare(`UPDATE rooms SET status = 'needs_cleaning' WHERE id = ?`).run(row.roomId);

    // Trigger notification for checkout
    triggerCheckout({
      id: row.roomId,
      number: row.number
    });

    const updated = getBookingWithRoom(bookingId);
    return {
      message: 'Check-out successful',
      booking: toBookingDTO(updated),
      room: toRoomDTO(updated),
    };
  })();
}

function adminUpgradeRoom(bookingId, newRoomType) {
  const row = getBookingWithRoom(bookingId);
  if (!row) return null;

  if (row.bookingStatus !== 'checked_in') {
    const err = new Error('Only checked_in bookings can be upgraded');
    err.code = 'INVALID_BOOKING_STATUS';
    throw err;
  }

  // Find an available room of the new type in the same location
  const availableRooms = getAvailableRooms({
    location: row.location,
    type: newRoomType,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
  });

  if (availableRooms.length === 0) {
    const err = new Error('No upgrade available for the requested type');
    err.code = 'NO_UPGRADE_AVAILABLE';
    throw err;
  }

  const newRoom = availableRooms[0];

  return db.transaction(() => {
    db.prepare(`UPDATE bookings SET roomId = ? WHERE id = ?`).run(newRoom.id, bookingId);
    db.prepare(`UPDATE rooms SET status = 'available' WHERE id = ?`).run(row.roomId);
    db.prepare(`UPDATE rooms SET status = 'occupied' WHERE id = ?`).run(newRoom.id);

    const updated = getBookingWithRoom(bookingId);
    return {
      message: 'Room upgraded successfully',
      booking: toBookingDTO(updated),
      room: toRoomDTO(updated),
    };
  })();
}

function adminExtendStay(bookingId, newCheckOut) {
  const row = getBookingWithRoom(bookingId);
  if (!row) return null;

  if (row.bookingStatus !== 'checked_in') {
    const err = new Error('Only checked_in bookings can be extended');
    err.code = 'INVALID_BOOKING_STATUS';
    throw err;
  }

  if (new Date(newCheckOut) <= new Date(row.checkOut)) {
    const err = new Error('New check-out date must be after current check-out date');
    err.code = 'INVALID_EXTENSION_DATE';
    throw err;
  }

  // Check for conflict with other bookings for the SAME room
  const conflict = db.prepare(`
    SELECT 1 FROM bookings 
    WHERE roomId = ? AND status IN ('confirmed', 'checked_in') 
      AND id != ? 
      AND checkIn < ? AND checkOut > ?
  `).get(row.roomId, bookingId, newCheckOut, row.checkOut);

  if (conflict) {
    const err = new Error('Room is already booked for the extended dates');
    err.code = 'EXTENSION_NOT_AVAILABLE';
    throw err;
  }

  db.prepare(`UPDATE bookings SET checkOut = ? WHERE id = ?`).run(newCheckOut, bookingId);

  const updated = getBookingWithRoom(bookingId);
  return {
    message: 'Stay extended successfully',
    booking: toBookingDTO(updated),
    room: toRoomDTO(updated),
  };
}

module.exports = {
  getAllAdminBookings,
  adminCheckIn,
  adminCheckOut,
  adminUpgradeRoom,
  adminExtendStay,
};

