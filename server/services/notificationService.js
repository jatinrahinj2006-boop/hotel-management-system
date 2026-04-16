/* ═══════════════════════════════════════════════
   NOTIFICATION SERVICE — Admin notification system
   ═══════════════════════════════════════════════ */

let notifications = [];
let nextId = 1;

/**
 * Create a new notification
 * @param {string} message - Notification message
 * @param {string} type - "booking" | "checkout" | "cleaning"
 * @param {Object} metadata - Additional data (roomNumber, etc.)
 * @returns {Object} Created notification
 */
function createNotification(message, type, metadata = {}) {
  const notification = {
    id: nextId++,
    message,
    type,
    createdAt: new Date().toISOString(),
    read: false,
    ...metadata
  };
  
  notifications.unshift(notification); // Add to beginning (newest first)
  
  // Keep only last 50 notifications to prevent memory issues
  if (notifications.length > 50) {
    notifications = notifications.slice(0, 50);
  }
  
  return notification;
}

/**
 * Get all notifications, optionally filtered by read status
 * @param {boolean} unreadOnly - Get only unread notifications
 * @returns {Array} Notifications
 */
function getNotifications(unreadOnly = false) {
  if (unreadOnly) {
    return notifications.filter(n => !n.read);
  }
  return notifications;
}

/**
 * Mark notification as read
 * @param {number} id - Notification ID
 * @returns {Object|null} Updated notification or null if not found
 */
function markAsRead(id) {
  const notification = notifications.find(n => n.id === parseInt(id));
  if (notification) {
    notification.read = true;
    return notification;
  }
  return null;
}

/**
 * Trigger notification for new booking
 * @param {Object} booking - Booking details
 */
function triggerNewBooking(booking) {
  const roomLabel = booking?.roomNumber || booking?.roomId || 'Unknown';
  const message = `New booking for Room ${roomLabel}`;
  createNotification(message, 'booking', {
    roomId: booking.roomId,
    roomNumber: booking.roomNumber
  });
}

/**
 * Trigger notification for checkout
 * @param {Object} room - Room details
 */
function triggerCheckout(room) {
  const roomLabel = room?.number || room?.id || 'Unknown';
  const message = `Room ${roomLabel} needs cleaning`;
  createNotification(message, 'checkout', {
    roomId: room.id,
    roomNumber: room.number
  });
}

/**
 * Trigger notification for cleaning completed
 * @param {Object} room - Room details
 */
function triggerCleaningComplete(room) {
  const roomLabel = room?.number || room?.id || 'Unknown';
  const message = `Room ${roomLabel} is ready`;
  createNotification(message, 'cleaning', {
    roomId: room.id,
    roomNumber: room.number
  });
}

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  triggerNewBooking,
  triggerCheckout,
  triggerCleaningComplete,
};
