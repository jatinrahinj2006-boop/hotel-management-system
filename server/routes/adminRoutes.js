/* ═══════════════════════════════════════════════
   ADMIN ROUTES — Room management
   ═══════════════════════════════════════════════ */

const { Router } = require('express');
const db = require('../db');
const { getAllRooms, updateRoomStatus } = require('../services/roomService');
const { getAllAdminBookings, adminCheckIn, adminCheckOut, adminUpgradeRoom, adminExtendStay } = require('../services/adminBookingService');
const { markCleaned } = require('../services/adminRoomService');
const { createAdminWalkInBooking } = require('../services/adminWalkInBookingService');
const { getRevenue } = require('../services/revenueService');
const { getNotifications, markAsRead } = require('../services/notificationService');

const router = Router();

// Hardcoded admin credentials
const ADMIN_CREDENTIALS = {
    email: 'admin@aurum.com',
    password: '123456'
};

// Simple in-memory sessions (for demo purposes)
const sessions = new Set();

/**
 * POST /api/admin/login
 * Simple login with hardcoded credentials
 */
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (email !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate simple session token
        const token = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2);
        sessions.add(token);

        res.json({ success: true, token });
    } catch (err) {
        console.error('POST /api/admin/login error:', err.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * GET /api/admin/revenue
 * Returns today's and monthly revenue based on bookings
 */
router.get('/revenue', (req, res) => {
    try {
        const revenue = getRevenue();
        res.json(revenue);
    } catch (err) {
        console.error('GET /api/admin/revenue error:', err.message);
        res.status(500).json({ error: 'Failed to fetch revenue' });
    }
});

/**
 * GET /api/admin/summary
 * Returns room status summary counts
 */
router.get('/summary', (req, res) => {
    try {
        const summary = db.prepare(`
            SELECT 
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
                SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
                SUM(CASE WHEN status = 'needs_cleaning' THEN 1 ELSE 0 END) as cleaning
            FROM rooms
        `).get();
        res.json(summary);
    } catch (err) {
        console.error('GET /api/admin/summary error:', err.message);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

/**
 * GET /api/admin/rooms
 * Returns paginated rooms with their current status and active booking count.
 * Query params: ?page=1&limit=10&search=405&status=occupied
 */
router.get('/rooms', (req, res) => {
    try {
        const { page, limit, search, status } = req.query;
        const result = getAllRooms({ page, limit, search, status });
        res.json(result);
    } catch (err) {
        console.error('GET /api/admin/rooms error:', err.message);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

/**
 * PATCH /api/admin/rooms/:id/status
 * Body: { status: "available" | "reserved" | "occupied" | "needs_cleaning" }
 */
router.patch('/rooms/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const room = updateRoomStatus(Number(id), status);

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json({ message: 'Room status updated', room });
    } catch (err) {
        console.error('PATCH /api/admin/rooms/:id/status error:', err.message);

        if (err.message.includes('Invalid status')) {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json({ error: 'Failed to update room status' });
    }
});

/**
 * POST /api/admin/rooms/:id/mark-cleaned
 * Strict rule: rooms.status must be "needs_cleaning"
 */
router.post('/rooms/:id/mark-cleaned', (req, res) => {
    try {
        const { id } = req.params;
        const result = markCleaned(Number(id));

        if (!result) return res.status(404).json({ error: 'Room not found' });
        return res.json(result);
    } catch (err) {
        console.error('POST /api/admin/rooms/:id/mark-cleaned error:', err.message);
        if (err.code === 'INVALID_ROOM_STATUS') {
            return res.status(409).json({
                code: err.code,
                error: err.message,
                expected: err.expected,
                actual: err.actual,
            });
        }
        return res.status(500).json({ error: 'Failed to mark cleaned' });
    }
});

/**
 * POST /api/admin/bookings
 * Offline walk-in booking:
 * - Creates booking with status "checked_in"
 * - Updates room status to "occupied"
 *
 * Body: { location, roomType, floor?, checkIn, checkOut }
 */
router.post('/bookings', (req, res) => {
    try {
        const { location, roomType, floor, checkIn, checkOut } = req.body;
        const result = createAdminWalkInBooking({ location, roomType, floor, checkIn, checkOut });

        res.status(201).json({
            message: 'Walk-in check-in confirmed',
            ...result,
        });
    } catch (err) {
        console.error('POST /api/admin/bookings error:', err.message);

        if (err.code === 'HOTEL_FULL') {
            return res.status(409).json({ error: err.message, code: 'HOTEL_FULL' });
        }

        // Validation errors
        if (err.message.includes('required') || err.message.includes('must be')) {
            return res.status(400).json({ error: err.message });
        }

        return res.status(500).json({ error: 'Failed to create walk-in booking' });
    }
});

/**
 * GET /api/admin/bookings
 * Returns paginated bookings filtered by status:
 * - status=active: bookings where status IN ('confirmed', 'checked_in')
 * - status=history: bookings where status = 'checked_out'
 * - default: active bookings
 * Query params: ?page=1&limit=10&status=active
 */
router.get('/bookings', (req, res) => {
    try {
        const { status, page, limit } = req.query;
        const result = getAllAdminBookings(status, { page, limit });
        res.json(result);
    } catch (err) {
        console.error('GET /api/admin/bookings error:', err.message);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

/**
 * POST /api/admin/bookings/:id/check-in
 * Strict rules:
 *  - booking.status must be "confirmed"
 *  - rooms.status must be "reserved"
 */
router.post('/bookings/:id/check-in', (req, res) => {
    try {
        const { id } = req.params;
        const result = adminCheckIn(Number(id));

        if (!result) return res.status(404).json({ error: 'Booking not found' });
        return res.json(result);
    } catch (err) {
        console.error('POST /api/admin/bookings/:id/check-in error:', err.message);
        if (err.code === 'INVALID_BOOKING_STATUS' || err.code === 'ROOM_STATUS_MISMATCH') {
            return res.status(409).json({
                code: err.code,
                error: err.message,
                expected: err.expected,
                actual: err.actual,
            });
        }
        return res.status(500).json({ error: 'Failed to check-in' });
    }
});

/**
 * POST /api/admin/bookings/:id/check-out
 * Strict rules:
 *  - booking.status must be "checked_in"
 *  - rooms.status must be "occupied"
 */
router.post('/bookings/:id/check-out', (req, res) => {
    try {
        const { id } = req.params;
        const result = adminCheckOut(Number(id));

        if (!result) return res.status(404).json({ error: 'Booking not found' });
        return res.json(result);
    } catch (err) {
        console.error('POST /api/admin/bookings/:id/check-out error:', err.message);
        if (err.code === 'INVALID_BOOKING_STATUS' || err.code === 'ROOM_STATUS_MISMATCH') {
            return res.status(409).json({
                code: err.code,
                error: err.message,
                expected: err.expected,
                actual: err.actual,
            });
        }
        return res.status(500).json({ error: 'Failed to check-out' });
    }
});

/**
 * POST /api/admin/bookings/:id/upgrade
 */
router.post('/bookings/:id/upgrade', (req, res) => {
    try {
        const { id } = req.params;
        const { newRoomType } = req.body;
        if (!newRoomType) {
            return res.status(400).json({ error: 'newRoomType is required' });
        }
        const result = adminUpgradeRoom(Number(id), newRoomType);
        if (!result) return res.status(404).json({ error: 'Booking not found' });
        return res.json(result);
    } catch (err) {
        console.error('POST /api/admin/bookings/:id/upgrade error:', err.message);
        if (err.code === 'NO_UPGRADE_AVAILABLE') {
            return res.status(409).json({ error: err.message });
        }
        if (err.code === 'INVALID_BOOKING_STATUS') {
            return res.status(409).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Failed to upgrade room' });
    }
});

/**
 * POST /api/admin/bookings/:id/extend
 */
router.post('/bookings/:id/extend', (req, res) => {
    try {
        const { id } = req.params;
        const { newCheckOut } = req.body;
        
        if (!newCheckOut) {
            return res.status(400).json({ error: 'newCheckOut is required' });
        }
        
        const result = adminExtendStay(Number(id), newCheckOut);
        
        if (!result) return res.status(404).json({ error: 'Booking not found' });
        return res.json(result);
    } catch (err) {
        console.error('POST /api/admin/bookings/:id/extend error:', err.message);
        if (err.code === 'EXTENSION_NOT_AVAILABLE') {
            return res.status(409).json({ error: err.message });
        }
        if (err.code === 'INVALID_BOOKING_STATUS' || err.code === 'INVALID_EXTENSION_DATE') {
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Failed to extend stay' });
    }
});

/**
 * GET /api/admin/notifications
 * Returns all notifications, optionally filtered by unread status
 */
router.get('/notifications', (req, res) => {
    try {
        const { unread } = req.query;
        const notifications = getNotifications(unread === 'true');
        // Return only latest 10 for frontend
        const limitedNotifications = notifications.slice(0, 10);
        res.json({ notifications: limitedNotifications });
    } catch (err) {
        console.error('GET /api/admin/notifications error:', err.message);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

/**
 * PATCH /api/admin/notifications/:id/read
 * Marks a notification as read
 */
router.patch('/notifications/:id/read', (req, res) => {
    try {
        const { id } = req.params;
        const notification = markAsRead(id);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json({ notification });
    } catch (err) {
        console.error('PATCH /api/admin/notifications/:id/read error:', err.message);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

module.exports = router;
