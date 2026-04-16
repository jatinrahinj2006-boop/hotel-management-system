/* ═══════════════════════════════════════════════
   ADMIN ROOM SERVICE — strict room transitions
   ═══════════════════════════════════════════════ */

const db = require('../db');
const { triggerCleaningComplete } = require('./notificationService');

function getRoomById(roomId) {
  return db.prepare(`SELECT * FROM rooms WHERE id = ?`).get(roomId);
}

function toRoomDTO(room) {
  return {
    id: room.id,
    number: room.number,
    type: room.type,
    floor: room.floor,
    status: room.status,
  };
}

function markCleaned(roomId) {
  const room = getRoomById(roomId);
  if (!room) return null;

  const expectedStatus = 'needs_cleaning';
  if (room.status !== expectedStatus) {
    const err = new Error('Invalid room status for marking cleaned');
    err.code = 'INVALID_ROOM_STATUS';
    err.expected = expectedStatus;
    err.actual = room.status;
    throw err;
  }

  return db.transaction(() => {
    db.prepare(`UPDATE rooms SET status = 'available' WHERE id = ?`).run(roomId);
    
    // Trigger notification for cleaning complete
    triggerCleaningComplete({
      id: room.id,
      number: room.number
    });
    
    const updated = getRoomById(roomId);
    return {
      message: 'Room marked as cleaned',
      room: toRoomDTO(updated),
    };
  })();
}

module.exports = {
  markCleaned,
};

