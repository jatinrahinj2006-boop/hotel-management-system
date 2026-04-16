/* ═══════════════════════════════════════════════
   ADMIN WALK-IN BOOKING SERVICE
   Creates a booking as checked_in and marks the room occupied.
   ═══════════════════════════════════════════════ */

const db = require('../db');
const { getAvailableRooms } = require('./roomService');
const { triggerNewBooking } = require('./notificationService');

function createAdminWalkInBooking({ location, roomType, floor, checkIn, checkOut }) {
  // Keep validations consistent with existing booking creation.
  if (!location || !roomType || !checkIn || !checkOut) {
    throw new Error('All fields are required: location, roomType, checkIn, checkOut');
  }

  if (new Date(checkOut) <= new Date(checkIn)) {
    throw new Error('Check-out date must be after check-in date');
  }

  // Match existing auto-allocation selection behavior:
  // - Preferred floor is attempted first (if provided)
  // - If none available, fall back to any floor
  let available = [];

  if (floor) {
    available = getAvailableRooms({
      location,
      type: roomType,
      // Note: intentionally uses the same key names as existing bookingService
      // (it may not run overlap exclusion at selection time, but conflict-check
      // below is the real guard).
      checkin: checkIn,
      checkout: checkOut,
      floor,
    });
  }

  if (available.length === 0) {
    available = getAvailableRooms({
      location,
      type: roomType,
      checkin: checkIn,
      checkout: checkOut,
    });
  }

  if (available.length === 0) {
    const err = new Error('Hotel Full');
    err.code = 'HOTEL_FULL';
    throw err;
  }

  const room = available[0];

  // Insert booking and update room in a transaction.
  const insertBooking = db.transaction(() => {
    // Double-check conflict at write time.
    const conflict = db.prepare(`
      SELECT 1 FROM bookings
      WHERE roomId = ?
        AND status IN ('confirmed', 'checked_in')
        AND checkIn < ?
        AND checkOut > ?
      LIMIT 1
    `).get(room.id, checkOut, checkIn);

    if (conflict) {
      const err = new Error('Hotel Full');
      err.code = 'HOTEL_FULL';
      throw err;
    }

    const result = db.prepare(`
      INSERT INTO bookings (roomId, checkIn, checkOut, status)
      VALUES (?, ?, ?, 'checked_in')
    `).run(room.id, checkIn, checkOut);

    // Mark room occupied immediately for admin walk-in.
    db.prepare("UPDATE rooms SET status = 'occupied' WHERE id = ?").run(room.id);

    // Trigger notification for new booking
    triggerNewBooking({
      roomId: room.id,
      roomNumber: room.number
    });

    return {
      booking: {
        id: result.lastInsertRowid,
        roomId: room.id,
        checkIn,
        checkOut,
        status: 'checked_in',
      },
      room: {
        id: room.id,
        number: room.number,
        type: room.type,
        location: room.location,
        floor: room.floor,
      },
    };
  });

  return insertBooking();
}

module.exports = {
  createAdminWalkInBooking,
};

