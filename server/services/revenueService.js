const db = require('../db');

function getRevenue() {
  const rows = db.prepare(`
    SELECT
      b.checkIn,
      b.checkOut,
      b.createdAt,
      r.type
    FROM bookings b
    JOIN rooms r ON r.id = b.roomId
    WHERE b.status IN ('confirmed', 'checked_in', 'checked_out')
  `).all();

  // Price mapping
  const prices = {
    deluxe: 5000,
    suite: 8000,
    penthouse: 12000
  };

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  let todayRevenue = 0;
  let monthlyRevenue = 0;

  for (const row of rows) {
    const checkInDate = new Date(row.checkIn);
    const checkOutDate = new Date(row.checkOut);
    
    // Calculate nights (at least 1, max is standard math)
    let nights = Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    if (nights < 1) nights = 1;

    const price = prices[row.type] || 0;
    const revenue = nights * price;

    // createdAt is usually "YYYY-MM-DD HH:MM:SS" (SQLite datetime('now'))
    // SQLite datetime('now') returns UTC string, e.g., "2023-10-01 10:20:30"
    if (!row.createdAt) continue;
    
    const createdDay = row.createdAt.slice(0, 10);
    const createdMonth = row.createdAt.slice(0, 7);

    if (createdDay === today) {
      todayRevenue += revenue;
    }
    if (createdMonth === thisMonth) {
      monthlyRevenue += revenue;
    }
  }

  return { todayRevenue, monthlyRevenue };
}

module.exports = {
  getRevenue
};
