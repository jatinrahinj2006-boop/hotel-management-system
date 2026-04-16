# Aurum Hotels — Hotel Management System

A comprehensive hotel management application with separate admin and customer interfaces for managing rooms, bookings, and hotel operations.

## Features

### Admin Panel
- **Room Management** — Add, update, and manage hotel rooms
- **Booking Management** — View, confirm, and manage all bookings
- **Check-in/Check-out** — Handle guest arrivals and departures
- **Room Upgrades** — Upgrade guests to better room types
- **Stay Extension** — Extend guest stays
- **Revenue Tracking** — Monitor daily and monthly revenue
- **Notifications** — Real-time alerts for bookings and operations
- **Walk-in Bookings** — Register unplanned guest arrivals
- **Rate Limiting** — Built-in API protection

### Customer Portal
- **Room Browsing** — View available rooms across multiple locations
- **Booking System** — Easy-to-use booking interface with date selection
- **Booking Management** — View and manage personal bookings
- **Location Filtering** — Filter rooms by location (Paris, Tokyo, Dubai, Maldives, New York)
- **Room Types** — Deluxe, Suite, and Penthouse options
- **Authentication** — Secure customer registration and login

### Security Features
- **Password Hashing** — Bcrypt encryption for all passwords
- **CORS Protection** — Cross-origin request handling
- **Security Headers** — HTTP security headers for protection
- **Rate Limiting** — API request throttling to prevent abuse
- **Input Validation** — Comprehensive data validation on all inputs

## Tech Stack

**Backend:**
- Node.js with Express.js
- SQLite with better-sqlite3 for data persistence
- Bcrypt for password hashing
- CORS for cross-origin requests

**Frontend:**
- HTML5
- CSS3 with modern styling
- Vanilla JavaScript (ES6+)
- Responsive design

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### Setup Steps

1. **Navigate to the project directory:**
   ```bash
   cd "HotelManager-V1"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Access the application:**
   - **Customer Portal:** http://localhost:3000
   - **Admin Panel:** http://localhost:3000/admin.html
   - **Admin Login Page:** http://localhost:3000/admin-login.html

## Usage

### Admin Login

Contact for admin access credentials

### Customer Experience
1. Visit the homepage at http://localhost:3000
2. Browse available rooms by location and type
3. Select dates and book a room
4. Register or login with your email
5. View and manage your bookings

### Admin Operations
1. Login with admin credentials
2. View dashboard with revenue and notifications
3. Manage rooms and their status
4. Handle guest check-ins and check-outs
5. Process room upgrades and stay extensions
6. Monitor booking activity

## Project Structure

```
HotelManager-V1/
├── README.md                      # This file
├── package.json                   # Project dependencies
├── server.js                      # Express server entry point
├── index.html                     # Customer portal homepage
├── admin.html                     # Admin dashboard
├── admin-login.html              # Admin login page
├── privacy.html                   # Privacy policy
├── styles.css                     # Global styles
├── adminRooms.js                 # Admin room management script
├── app.js                         # Frontend application logic
├── assets/                        # Static assets (images, icons)
└── server/
    ├── db.js                      # Database setup and migrations
    ├── middleware/
    │   ├── customerAuth.js        # Customer authentication middleware
    │   ├── rateLimit.js           # Rate limiting middleware
    │   └── securityHeaders.js     # Security headers middleware
    ├── routes/
    │   ├── adminRoutes.js         # Admin API endpoints
    │   ├── authRoutes.js          # Authentication endpoints
    │   ├── bookingRoutes.js       # Booking API endpoints
    │   ├── customerBookingRoutes.js # Customer booking endpoints
    │   └── roomRoutes.js          # Room API endpoints
    ├── services/
    │   ├── adminBookingService.js # Admin booking operations
    │   ├── adminRoomService.js    # Admin room operations
    │   ├── adminWalkInBookingService.js # Walk-in booking service
    │   ├── authService.js         # Authentication service
    │   ├── bookingService.js      # Booking service logic
    │   ├── notificationService.js # Notification handling
    │   ├── revenueService.js      # Revenue calculations
    │   └── roomService.js         # Room service logic
    └── utils/
        └── validation.js          # Input validation utilities
```

## API Endpoints

### Admin Routes (`/api/admin`)
- `POST /login` — Admin login
- `GET /rooms` — Get all rooms
- `GET /bookings` — Get all bookings
- `POST /check-in` — Check-in guest
- `POST /check-out` — Check-out guest
- `POST /upgrade-room` — Upgrade guest room
- `POST /extend-stay` — Extend booking duration
- `POST /mark-cleaned` — Mark room as cleaned
- `POST /walk-in-booking` — Create walk-in booking
- `GET /revenue` — Get revenue data
- `GET /notifications` — Get notifications

### Auth Routes (`/api/auth`)
- `POST /register` — Customer registration
- `POST /login` — Customer login

### Room Routes (`/api/rooms`)
- `GET /` — Get all rooms
- `GET /by-location/:location` — Filter by location
- `GET /available` — Get available rooms

### Booking Routes (`/api/bookings`)
- `POST /` — Create new booking
- `GET /user/:userId` — Get user's bookings
- `POST /cancel` — Cancel booking

## Database

The application uses SQLite with three main tables:

**rooms** — Hotel room inventory
- id, number, type, location, floor, price, status

**bookings** — Guest reservations
- id, roomId, checkIn, checkOut, status, createdAt, userId

**users** — Customer accounts
- id, name, email, phone, password, createdAt

## Room Types & Pricing

| Type | Price/Night |
|------|------------|
| Deluxe | $450 |
| Suite | $850 |
| Penthouse | $1,800 |

## Locations

- Paris, France
- Tokyo, Japan
- Dubai, UAE
- Maldives
- New York, USA

## Security Considerations

- Change the hardcoded admin credentials immediately for production
- Implement proper JWT authentication for production use
- Use environment variables for sensitive configuration
- Add database backups and recovery procedures
- Implement logging and monitoring
- Use HTTPS in production
- Consider implementing 2FA for admin access

## Future Enhancements

- [ ] Email notifications for bookings
- [ ] Payment gateway integration
- [ ] Guest reviews and ratings
- [ ] Housekeeping management
- [ ] Staff scheduling
- [ ] Multi-language support
- [ ] Mobile app
- [ ] Advanced reporting and analytics
- [ ] Loyalty program
- [ ] Dynamic pricing

## Troubleshooting

**Server won't start:**
- Ensure port 3000 is not in use
- Check Node.js is installed: `node --version`
- Verify all dependencies: `npm install`

**Database issues:**
- Delete `hotel.db` to reset the database
- The database will be recreated with seed data on next start

**Admin login fails:**
- Verify credentials are correct: `admin@aurum.com` / `123456`
- Check browser console for error messages

## License

© 2026 Aurum Hotels. All rights reserved.

## Support

For issues or questions, please contact the development team.
