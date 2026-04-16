/* ═══════════════════════════════════════════════
   BOOKING SERVICE — Auto-allocation logic
   ═══════════════════════════════════════════════ */

const db = require('../db');
const { getAvailableRooms } = require('./roomService');
const { createNotification } = require('./notificationService');

/**
 * Utility: Capitalize first letter of a string
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Create a booking with auto room allocation.
 *
 * 1. Find available rooms matching type + location for the date range
 * 2. Pick the first one
 * 3. Insert a booking record
 * 4. If none available → throw "Hotel Full"
 *
 * @param {Object} params
 * @param {string} params.location
 * @param {string} params.roomType
 * @param {string} params.checkIn  - ISO date (YYYY-MM-DD)
 * @param {string} params.checkOut - ISO date (YYYY-MM-DD)
 * @returns {Object} { booking, room }
 */
function createBooking({ location, roomType, checkIn, checkOut, preferredFloor, userId }) {
    // Debug: Log input parameters
    console.log('\n=== CREATE BOOKING SERVICE ===');
    console.log('Input params:', { location, roomType, checkIn, checkOut, preferredFloor, userId });
    
    // Validate inputs
    if (!location || !roomType || !checkIn || !checkOut) {
        const missing = [];
        if (!location) missing.push('location');
        if (!roomType) missing.push('roomType');
        if (!checkIn) missing.push('checkIn');
        if (!checkOut) missing.push('checkOut');
        const error = `All fields are required: ${missing.join(', ')}`;
        console.error('VALIDATION ERROR:', error);
        throw new Error(error);
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
        const error = 'Check-out date must be after check-in date';
        console.error('DATE VALIDATION ERROR:', error);
        throw new Error(error);
    }

    // Try preferred floor first, then fall back to any floor
    let available = [];

    if (preferredFloor) {
        console.log('Searching for rooms with preferred floor:', preferredFloor);
        available = getAvailableRooms({
            location,
            type: roomType,
            checkIn: checkIn,
            checkOut: checkOut,
            floor: preferredFloor,
        });
        console.log('AVAILABLE ROOMS (PREFERRED FLOOR):', available.length, 'rooms found');
    }

    // Fallback to any floor if preferred floor has nothing
    if (available.length === 0) {
        console.log('No rooms on preferred floor, searching any floor...');
        available = getAvailableRooms({
            location,
            type: roomType,
            checkIn: checkIn,
            checkOut: checkOut,
        });
        console.log('AVAILABLE ROOMS (ANY FLOOR):', available.length, 'rooms found');
    }

    if (available.length === 0) {
        const message = 'Hotel Full — no rooms available for the selected dates and type';
        console.log('ALLOCATION FAILED:', message);
        const err = new Error(message);
        err.code = 'HOTEL_FULL';
        throw err;
    }

    // Pick the first available room
    const room = available[0];
    console.log('SELECTED ROOM:', { id: room.id, number: room.number, type: room.type, floor: room.floor });

    // Insert booking inside a transaction for safety
    const insertBooking = db.transaction(() => {
        // Double-check: no overlapping booking was inserted between our check and now
        const conflict = db.prepare(`
      SELECT 1 FROM bookings
      WHERE roomId = ?
        AND status IN ('confirmed', 'checked_in')
        AND checkIn < ?
        AND checkOut > ?
      LIMIT 1
    `).get(room.id, checkOut, checkIn);

        if (conflict) {
            const err = new Error('Hotel Full — room was just booked by another guest');
            err.code = 'HOTEL_FULL';
            throw err;
        }

        const result = db.prepare(`
      INSERT INTO bookings (roomId, checkIn, checkOut, status, userId)
      VALUES (?, ?, ?, 'confirmed', ?)
    `).run(room.id, checkIn, checkOut, userId || null);

        // Update room status to reserved
        db.prepare("UPDATE rooms SET status = 'reserved' WHERE id = ?").run(room.id);

        // Create notification for new online booking
        const notificationMessage = `New online booking: Room ${room.number} (${capitalizeFirst(room.type)} - Floor ${room.floor})`;
        createNotification(notificationMessage, 'booking', {
            roomId: room.id,
            roomNumber: room.number,
            roomType: room.type,
            floor: room.floor,
            bookingType: 'online'
        });

        const bookingData = {
            booking: {
                id: result.lastInsertRowid,
                roomId: room.id,
                checkIn,
                checkOut,
                status: 'confirmed',
                userId: userId || null,
            },
            room: {
                id: room.id,
                number: room.number,
                type: room.type,
                location: room.location,
                floor: room.floor,
            },
        };
        console.log('BOOKING INSERTED SUCCESSFULLY:', bookingData.booking);
        return bookingData;
    });

    return insertBooking();
}

/**
 * Get all bookings (optionally filtered).
 * @param {Object} [filters]
 * @returns {Array}
 */
function getAllBookings() {
    return db.prepare(`
    SELECT b.*, r.number AS roomNumber, r.type AS roomType, r.location
    FROM bookings b
    JOIN rooms r ON r.id = b.roomId
    ORDER BY b.checkIn DESC
  `).all();
}

/**
 * Get bookings for a specific user
 * @param {number} userId
 * @returns {Array}
 */
function getBookingsByUserId(userId) {
    return db.prepare(`
    SELECT b.*, r.number AS roomNumber, r.type AS roomType, r.location
    FROM bookings b
    JOIN rooms r ON r.id = b.roomId
    WHERE b.userId = ?
    ORDER BY b.checkIn DESC
  `).all(userId);
}

/**
 * Get a booking by ID (for access control checks)
 * @param {number} bookingId
 * @returns {Object|null}
 */
function getBookingById(bookingId) {
    return db.prepare(`
    SELECT b.*, r.number AS roomNumber, r.type AS roomType, r.location
    FROM bookings b
    JOIN rooms r ON r.id = b.roomId
    WHERE b.id = ?
  `).get(bookingId);
}

/**
 * Update a booking's dates with ownership validation
 * @param {number} bookingId
 * @param {number} userId
 * @param {Object} updates
 * @returns {Object}
 */
function updateBooking(bookingId, userId, { checkIn, checkOut }) {
    const booking = getBookingById(bookingId);
    if (!booking) {
        const err = new Error('Booking not found');
        err.code = 'BOOKING_NOT_FOUND';
        throw err;
    }

    // IDOR protection: Verify booking belongs to user
    if (booking.userId !== userId) {
        const err = new Error('Access denied');
        err.code = 'ACCESS_DENIED';
        throw err;
    }

    // Validate dates
    if (new Date(checkOut) <= new Date(checkIn)) {
        const err = new Error('Check-out date must be after check-in date');
        err.code = 'INVALID_DATES';
        throw err;
    }

    // Check for conflicts with other bookings for the same room
    const conflict = db.prepare(`
        SELECT 1 FROM bookings 
        WHERE roomId = ? AND status IN ('confirmed', 'checked_in') 
        AND id != ? 
        AND checkIn < ? AND checkOut > ?
    `).get(booking.roomId, bookingId, checkOut, checkIn);

    if (conflict) {
        const err = new Error('Room is not available for the selected dates');
        err.code = 'DATES_NOT_AVAILABLE';
        throw err;
    }

    db.prepare(`UPDATE bookings SET checkIn = ?, checkOut = ? WHERE id = ?`)
        .run(checkIn, checkOut, bookingId);

    return getBookingById(bookingId);
}

/**
 * Extend a booking's stay with ownership validation
 * @param {number} bookingId
 * @param {number} userId
 * @param {string} newCheckOut
 * @returns {Object}
 */
function extendBooking(bookingId, userId, newCheckOut) {
    const booking = getBookingById(bookingId);
    if (!booking) {
        const err = new Error('Booking not found');
        err.code = 'BOOKING_NOT_FOUND';
        throw err;
    }

    // IDOR protection: Verify booking belongs to user
    if (booking.userId !== userId) {
        const err = new Error('Access denied');
        err.code = 'ACCESS_DENIED';
        throw err;
    }

    // Validate status
    if (booking.status !== 'checked_in') {
        const err = new Error('Only checked-in bookings can be extended');
        err.code = 'INVALID_BOOKING_STATUS';
        throw err;
    }

    // Validate date
    if (new Date(newCheckOut) <= new Date(booking.checkOut)) {
        const err = new Error('New check-out date must be after current check-out date');
        err.code = 'INVALID_EXTENSION_DATE';
        throw err;
    }

    // Check for conflicts
    const conflict = db.prepare(`
        SELECT 1 FROM bookings 
        WHERE roomId = ? AND status IN ('confirmed', 'checked_in') 
        AND id != ? 
        AND checkIn < ? AND checkOut > ?
    `).get(booking.roomId, bookingId, newCheckOut, booking.checkOut);

    if (conflict) {
        const err = new Error('Room is already booked for the extended dates');
        err.code = 'EXTENSION_NOT_AVAILABLE';
        throw err;
    }

    db.prepare(`UPDATE bookings SET checkOut = ? WHERE id = ?`)
        .run(newCheckOut, bookingId);

    return getBookingById(bookingId);
}

/**
 * Upgrade a booking to a better room with ownership validation
 * @param {number} bookingId
 * @param {number} userId
 * @param {string} newRoomType
 * @returns {Object}
 */
function upgradeBooking(bookingId, userId, newRoomType) {
    const booking = getBookingById(bookingId);
    if (!booking) {
        const err = new Error('Booking not found');
        err.code = 'BOOKING_NOT_FOUND';
        throw err;
    }

    // IDOR protection: Verify booking belongs to user
    if (booking.userId !== userId) {
        const err = new Error('Access denied');
        err.code = 'ACCESS_DENIED';
        throw err;
    }

    // Validate status
    if (booking.status !== 'checked_in') {
        const err = new Error('Only checked-in bookings can be upgraded');
        err.code = 'INVALID_BOOKING_STATUS';
        throw err;
    }

    // Find available room of new type
    const availableRooms = getAvailableRooms({
        location: booking.location,
        type: newRoomType,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
    });

    if (availableRooms.length === 0) {
        const err = new Error('No upgrade available for the requested type');
        err.code = 'NO_UPGRADE_AVAILABLE';
        throw err;
    }

    const newRoom = availableRooms[0];

    return db.transaction(() => {
        db.prepare(`UPDATE bookings SET roomId = ? WHERE id = ?`).run(newRoom.id, bookingId);
        db.prepare(`UPDATE rooms SET status = 'available' WHERE id = ?`).run(booking.roomId);
        db.prepare(`UPDATE rooms SET status = 'occupied' WHERE id = ?`).run(newRoom.id);

        return {
            booking: getBookingById(bookingId),
            room: newRoom,
        };
    })();
}

module.exports = {
    createBooking,
    getAllBookings,
    getBookingsByUserId,
    getBookingById,
    updateBooking,
    extendBooking,
    upgradeBooking,
};
