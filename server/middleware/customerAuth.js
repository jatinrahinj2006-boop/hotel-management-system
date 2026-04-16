const db = require('../db');

function customerAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        const token = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : null;

        console.log("TOKEN RECEIVED:", token);

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // 🔥 CRITICAL: DO NOT MODIFY TOKEN
        const userId = token;

        console.log("LOOKING FOR USER ID:", userId);

        const user = db.prepare(
            'SELECT id, name, email, phone FROM users WHERE id = ?'
        ).get(userId);

        console.log("USER FOUND:", user);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;

        next();
    } catch (err) {
        console.error("AUTH ERROR:", err);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

module.exports = { customerAuth };
