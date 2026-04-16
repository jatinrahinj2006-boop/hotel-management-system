/* ═══════════════════════════════════════════════
   ROOM ROUTES — GET /api/rooms
   ═══════════════════════════════════════════════ */

const { Router } = require('express');
const { getAvailableRooms } = require('../services/roomService');
const { isValidRoomType, isValidLocation } = require('../utils/validation');

const router = Router();

/**
 * GET /api/rooms
 * Query params: location, type, checkin, checkout, floor
 * Returns available rooms matching the filters.
 */
router.get('/', (req, res) => {
    try {
        const { location, type, checkIn, checkOut, floor } = req.query;
        
        // Validate room type if provided
        if (type && !isValidRoomType(type)) {
            return res.status(400).json({ 
                error: 'Invalid room type. Must be: deluxe, suite, or penthouse' 
            });
        }
        
        // Validate location if provided
        if (location && !isValidLocation(location)) {
            return res.status(400).json({ 
                error: 'Invalid location. Must be: downtown, airport, or suburb' 
            });
        }
        
        const rooms = getAvailableRooms({ location, type, checkIn, checkOut, floor });
        res.json({ rooms, count: rooms.length });
    } catch (err) {
        console.error('GET /api/rooms error:', err.message);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

module.exports = router;
