/* ═══════════════════════════════════════════════
   CUSTOMER BOOKING ROUTES — Access Control
   Users can only access their own bookings
   ═══════════════════════════════════════════════ */

const { Router } = require('express');
const { createBooking, getBookingsByUserId, getBookingById, updateBooking, extendBooking, upgradeBooking } = require('../services/bookingService');
const { customerAuth } = require('../middleware/customerAuth');

const router = Router();

/**
 * GET /api/customer/bookings
 * Get all bookings for the logged-in user
 * Protected: Only returns bookings belonging to the user
 */
router.get('/', customerAuth, (req, res) => {
    try {
        const userId = req.user.id;
        const bookings = getBookingsByUserId(userId).map(b => ({
            id: b.id,
            roomId: b.roomId,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            status: b.status,
            roomNumber: b.roomNumber,
            roomType: b.roomType,
            location: b.location
        }));
        res.json(bookings);
    } catch (err) {
        console.error('GET /api/customer/bookings error:', err.message);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

/**
 * GET /api/customer/bookings/:id
 * Get a specific booking by ID
 * Protected: Only returns if booking belongs to the user (403 otherwise)
 */
router.get('/:id', customerAuth, (req, res) => {
    try {
        const userId = req.user.id;
        const bookingId = parseInt(req.params.id, 10);

        const booking = getBookingById(bookingId);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Access control: Only allow if booking belongs to user
        if (booking.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({
            id: booking.id,
            roomId: booking.roomId,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            status: booking.status,
            roomNumber: booking.roomNumber,
            roomType: booking.roomType,
            location: booking.location
        });
    } catch (err) {
        console.error('GET /api/customer/bookings/:id error:', err.message);
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});

/**
 * POST /api/customer/bookings
 * Create a new booking for the logged-in user
 * Protected: Associates booking with the authenticated user
 */
router.post('/', customerAuth, (req, res) => {
    try {
        // Debug: Log incoming request
        console.log('\n=== BOOKING REQUEST ===');
        console.log('BOOKING REQUEST BODY:', req.body);
        console.log('USER:', req.user);
        
        // Check if user is authenticated
        if (!req.user || !req.user.id) {
            console.error('AUTH FAILED: User not authenticated');
            return res.status(401).json({ error: 'Unauthorized. Please login to create a booking.' });
        }
        
        const userId = req.user.id;
        const { location, roomType, checkIn, checkOut, preferredFloor } = req.body;
        
        console.log('EXTRACTED PARAMS:', { location, roomType, checkIn, checkOut, preferredFloor });

        const result = createBooking({
            location,
            roomType,
            checkIn,
            checkOut,
            preferredFloor,
            userId
        });
        
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

        // Validation errors
        if (err.message.includes('required') || err.message.includes('must be')) {
            console.log('VALIDATION ERROR - Returning 400:', err.message);
            return res.status(400).json({ error: err.message });
        }

        console.log('GENERIC ERROR - Returning 500 with actual error message');
        res.status(500).json({ error: err.message || 'Failed to create booking' });
    }
});

/**
 * PUT /api/customer/bookings/:id
 * Update booking dates
 * Protected: Only updates if booking belongs to the user (403 otherwise)
 */
router.put('/:id', customerAuth, (req, res) => {
    try {
        const userId = req.user.id;
        const bookingId = parseInt(req.params.id, 10);
        const { checkIn, checkOut } = req.body;

        const updated = updateBooking(bookingId, userId, { checkIn, checkOut });

        res.json({
            message: 'Booking updated successfully',
            booking: updated
        });
    } catch (err) {
        console.error('PUT /api/customer/bookings/:id error:', err.message);

        if (err.code === 'BOOKING_NOT_FOUND') {
            return res.status(404).json({ error: err.message });
        }
        if (err.code === 'ACCESS_DENIED') {
            return res.status(403).json({ error: err.message });
        }
        if (err.code === 'INVALID_DATES' || err.code === 'DATES_NOT_AVAILABLE') {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json({ error: 'Failed to update booking' });
    }
});

/**
 * POST /api/customer/bookings/:id/extend
 * Extend a checked-in booking
 * Protected: Only extends if booking belongs to the user (403 otherwise)
 */
router.post('/:id/extend', customerAuth, (req, res) => {
    try {
        const userId = req.user.id;
        const bookingId = parseInt(req.params.id, 10);
        const { newCheckOut } = req.body;

        const extended = extendBooking(bookingId, userId, newCheckOut);

        res.json({
            message: 'Stay extended successfully',
            booking: extended
        });
    } catch (err) {
        console.error('POST /api/customer/bookings/:id/extend error:', err.message);

        if (err.code === 'BOOKING_NOT_FOUND') {
            return res.status(404).json({ error: err.message });
        }
        if (err.code === 'ACCESS_DENIED') {
            return res.status(403).json({ error: err.message });
        }
        if (err.code === 'INVALID_BOOKING_STATUS' || err.code === 'INVALID_EXTENSION_DATE' || err.code === 'EXTENSION_NOT_AVAILABLE') {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json({ error: 'Failed to extend booking' });
    }
});

/**
 * POST /api/customer/bookings/:id/upgrade
 * Upgrade a checked-in booking to a better room
 * Protected: Only upgrades if booking belongs to the user (403 otherwise)
 */
router.post('/:id/upgrade', customerAuth, (req, res) => {
    try {
        const userId = req.user.id;
        const bookingId = parseInt(req.params.id, 10);
        const { newRoomType } = req.body;

        const result = upgradeBooking(bookingId, userId, newRoomType);

        res.json({
            message: 'Room upgraded successfully',
            ...result
        });
    } catch (err) {
        console.error('POST /api/customer/bookings/:id/upgrade error:', err.message);

        if (err.code === 'BOOKING_NOT_FOUND') {
            return res.status(404).json({ error: err.message });
        }
        if (err.code === 'ACCESS_DENIED') {
            return res.status(403).json({ error: err.message });
        }
        if (err.code === 'INVALID_BOOKING_STATUS' || err.code === 'NO_UPGRADE_AVAILABLE') {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json({ error: 'Failed to upgrade booking' });
    }
});

module.exports = router;
