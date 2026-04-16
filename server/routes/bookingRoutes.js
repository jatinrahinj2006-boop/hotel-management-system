/* ═══════════════════════════════════════════════
   BOOKING ROUTES — POST /api/bookings
   ═══════════════════════════════════════════════ */

const { Router } = require('express');
const { createBooking, getAllBookings } = require('../services/bookingService');
const { customerAuth } = require('../middleware/customerAuth');
const { validateBookingDates, isValidRoomType, isValidLocation } = require('../utils/validation');

const router = Router();

/**
 * GET /api/bookings
 * Returns all bookings with roomId, checkIn, checkOut (public endpoint for availability)
 */
router.get('/', (req, res) => {
    try {
        const bookings = getAllBookings().map(b => ({
            roomId: b.roomId,
            checkIn: b.checkIn,
            checkOut: b.checkOut
        }));
        res.json(bookings);
    } catch (err) {
        console.error('GET /api/bookings error:', err.message);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

/**
 * POST /api/bookings
 * Body: { location, roomType, checkIn, checkOut, userId }
 * Auto-allocates a room and creates a booking.
 * If userId is provided (authenticated user), booking is associated with that user.
 */
router.post('/', customerAuth, (req, res) => {
    try {
        // Debug: Log incoming request
        console.log('\n=== BOOKING REQUEST (via /api/bookings) ===');
        console.log('BOOKING REQUEST BODY:', req.body);
        console.log('USER:', req.user);
        
        const { location, roomType, checkIn, checkOut, preferredFloor } = req.body;
        
        // Check if user is authenticated
        if (!req.user) {
            console.error('AUTH FAILED: User not authenticated');
            return res.status(401).json({ error: 'Unauthorized. Please login to create a booking.' });
        }
        
        const userId = req.user.id;
        console.log('EXTRACTED PARAMS:', { location, roomType, checkIn, checkOut, preferredFloor });
        
        // Validate required fields
        if (!location || !roomType || !checkIn || !checkOut) {
            const missing = [];
            if (!location) missing.push('location');
            if (!roomType) missing.push('roomType');
            if (!checkIn) missing.push('checkIn');
            if (!checkOut) missing.push('checkOut');
            const errorMsg = `Missing fields: ${missing.join(', ')}`;
            console.error('VALIDATION ERROR:', errorMsg);
            return res.status(400).json({ error: errorMsg });
        }
        
        // Validate location
        if (!isValidLocation(location)) {
            const errorMsg = 'Invalid location. Must be: downtown, airport, or suburb';
            console.error('LOCATION VALIDATION ERROR:', errorMsg);
            return res.status(400).json({ error: errorMsg });
        }
        
        // Validate room type
        if (!isValidRoomType(roomType)) {
            const errorMsg = 'Invalid roomType. Must be: deluxe, suite, or penthouse';
            console.error('ROOMTYPE VALIDATION ERROR:', errorMsg);
            return res.status(400).json({ error: errorMsg });
        }
        
        // Validate dates
        const dateValidation = validateBookingDates(checkIn, checkOut);
        if (!dateValidation.valid) {
            console.error('DATE VALIDATION ERROR:', dateValidation.error);
            return res.status(400).json({ error: dateValidation.error });
        }
        
        const result = createBooking({ location, roomType, checkIn, checkOut, preferredFloor, userId });
        console.log('BOOKING SUCCESS:', result.booking);

        res.status(201).json({
            message: 'Booking confirmed',
            ...result,
        });
    } catch (err) {
        console.error('BOOKING ERROR:', err.message);
        console.error('ERROR STACK:', err.stack);
        console.error('ERROR CODE:', err.code);

        if (err.code === 'HOTEL_FULL') {
            console.log('HOTEL FULL - Returning 409 with message:', err.message);
            return res.status(409).json({ error: err.message, code: 'HOTEL_FULL' });
        }

        console.log('GENERIC ERROR - Returning 500 with actual error message');
        res.status(500).json({ error: err.message || 'Failed to create booking' });
    }
});

module.exports = router;
