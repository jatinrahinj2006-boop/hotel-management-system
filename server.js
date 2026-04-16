/* ═══════════════════════════════════════════════
   AURUM HOTELS — Express Server
   ═══════════════════════════════════════════════ */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize database (creates tables + seeds on first run)
require('./server/db');

const { rateLimit } = require('./server/middleware/rateLimit');
const { securityHeaders } = require('./server/middleware/securityHeaders');
const roomRoutes = require('./server/routes/roomRoutes');
const bookingRoutes = require('./server/routes/bookingRoutes');
const customerBookingRoutes = require('./server/routes/customerBookingRoutes');
const adminRoutes = require('./server/routes/adminRoutes');
const authRoutes = require('./server/routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

/* ─── MIDDLEWARE ─── */
app.use(cors());
app.use(securityHeaders);
app.use(express.json());

/* ─── STATIC FILES (Frontend) ─── */
app.use(express.static(path.join(__dirname)));

/* ─── API ROUTES ─── */
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', rateLimit, bookingRoutes);
app.use('/api/customer/bookings', rateLimit, customerBookingRoutes);
app.use('/api/admin', rateLimit, adminRoutes);

/* ─── HEALTH CHECK ─── */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ─── START ─── */
app.listen(PORT, () => {
    console.log(`\n  ╔═══════════════════════════════════════╗`);
    console.log(`  ║   AURUM HOTELS — Server Running       ║`);
    console.log(`  ║   http://localhost:${PORT}               ║`);
    console.log(`  ╚═══════════════════════════════════════╝\n`);
});
