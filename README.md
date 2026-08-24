# 🎟️ Ticket Booking System — Real-Time Movie & Concert Ticket Booking Platform (MERN Stack)

> A full-stack MERN platform engineered for **hard database-level concurrency protection**, **live visual seat maps**, **time-boxed seat holds**, **automated cascading waitlists**, and **verified QR admission passes**.

---

## 📑 Table of Contents
1. [Architecture & System Design Write-Up](#-system-design-write-up)
   - [Seat Hold & TTL Mechanism](#1-seat-hold--ttl-mechanism)
   - [Atomic Concurrency Prevention Approach](#2-atomic-concurrency-prevention-approach)
   - [Waitlist Auto-Assignment & Cascading Flow](#3-waitlist-auto-assignment--cascading-flow)
   - [Time-Limited Offer Handling](#4-time-limited-offer-handling)
2. [Database Schema Specifications](#-database-schema-specifications)
3. [REST API Documentation](#-rest-api-documentation)
4. [Real-Time WebSocket Events](#-real-time-websocket-events-socketio)
5. [Getting Started & Local Setup](#-getting-started--local-setup)
6. [Environment Variables](#-environment-variables)
7. [Automated Test Suites](#-automated-test-suites)
8. [Demo Credentials](#-pre-seeded-demo-credentials)

---

## 🏛️ System Design Write-Up

### 1. Seat Hold & TTL Mechanism
Seat selection in TicketNow is governed by a strict state lifecycle:
$$\text{available} \longrightarrow \text{held (TTL Running)} \longrightarrow \text{booked}$$

- **10-Minute Hold TTL**: When a customer clicks a seat, the system issues a time-boxed hold (`status = 'held'`, `heldBy = customerId`, `holdExpiresAt = now + 10m`).
- **Hybrid Sweeper + Lazy Expiry**:
  1. **Proactive Background Cron Sweep**: A lightweight background job (`sweepExpiredHolds`) runs every 10 seconds, releasing abandoned holds back to `available` and broadcasting real-time updates to all connected viewers over Socket.io.
  2. **Lazy Expiry Safety Net**: Every read and write conditional filter treats expired holds (`holdExpiresAt < now`) as instantly available, guaranteeing that stale records can never block legitimate booking attempts even if background jobs experience delay.

### 2. Atomic Concurrency Prevention Approach
To eliminate the risk of double-booking under high-load ticket sales, TicketNow implements **Database-Level Atomic Conditional Updates** paired with a **Compound Unique Index**:

```javascript
// ShowSeat atomic conditional lock
const holdFilter = {
  show: showId,
  seatId: seatId,
  $or: [
    { status: 'available' },
    { status: 'held', heldBy: customerId },
    { status: 'held', holdExpiresAt: { $lt: now } }
  ]
};

const lockedSeat = await ShowSeat.findOneAndUpdate(
  holdFilter,
  { $set: { status: 'held', heldBy: customerId, holdExpiresAt: expireTime } },
  { new: true }
);
```

- **Hard Concurrency Guarantee**: MongoDB document-level write locks guarantee that if two users attempt to select the same seat in the exact same millisecond, only the first request matches the conditional filter. The second request returns null and receives a hard **`409 Conflict — Seat no longer available`** error.
- **Unique Constraint**: The compound index `ShowSeat.(show, seatId)` guarantees absolute seat uniqueness per show.

### 3. Waitlist Auto-Assignment & Cascading Flow
When an event category reaches 100% capacity:
1. **FIFO Queue Ordering**: Customers join a category waitlist indexed by `Waitlist.(show, category, status, joinedAt)`.
2. **Instant Cancellation Trigger**: When a confirmed booking is cancelled via `PATCH /api/bookings/:id/cancel`, the system immediately executes `assignSeatToNextInWaitlist`.
3. **Automated Dispatch**: The `#1` customer in line is atomically transitioned to `status: 'offered'`, the freed `ShowSeat` is locked exclusively for them, and a private 15-minute claim token is generated and delivered via both WebSocket alert (`waitlist:offered`) and Nodemailer email.

### 4. Time-Limited Offer Handling
- **Cascading Sweeper**: If the offer is not claimed within 15 minutes, `sweepExpiredWaitlistOffers` automatically marks the entry `expired` and immediately cascades the seat to the next person in line.
- If the waitlist queue is empty, the seat reverts to `available` for general public booking.

---

## 🗄️ Database Schema Specifications

```
  ┌────────────┐       ┌────────────┐       ┌────────────┐
  │    User    │──────<│EventListing│──────<│    Show    │
  └────────────┘       └────────────┘       └────────────┘
        │                                         │
        │                                         ├────────────< ShowSeat
        │                                         ├────────────< Booking
        └─────────────────────────────────────────┴────────────< Waitlist
```

### Models & Critical Indexes
- **`User`**: Authentication, hashed passwords, roles (`customer`, `organiser`, `admin`).
- **`Venue`**: Coordinate grid layout (`seatLayout`), categories (`VIP Recliner`, `Premium`, `Standard`), and total capacity.
- **`EventListing`**: Movie/Concert metadata, posters, descriptions.
- **`Show`**: Venue binding, showtime, per-category pricing.
- **`ShowSeat`**: Live seat statuses (`available`, `held`, `booked`).
  - 🔑 *Index*: `{ show: 1, seatId: 1 }` (Unique).
- **`Booking`**: Unique reference `TN-XXXXXXX`, snapshot pricing in `seats` array (`priceAtBooking`), QR payload, status (`confirmed`, `cancelled`).
- **`Waitlist`**: FIFO priority queue entries (`status`, `offerExpiresAt`, `joinedAt`).
  - 🔑 *Index*: `{ show: 1, category: 1, status: 1, joinedAt: 1 }`.

---

## 🔌 REST API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account
- `POST /api/auth/login` — Sign in and receive JWT token
- `GET /api/auth/me` — Fetch current user profile

### Venues & Seat Layouts (`/api/venues`)
- `GET /api/venues` — List all physical venues
- `POST /api/venues` — Create venue with visual seat layout (Admin)
- `GET /api/venues/:id` — Get venue layout coordinates

### Events & Shows (`/api/events` & `/api/shows`)
- `GET /api/events` — Catalog with category & city filters
- `POST /api/events` — Create movie/concert listing (Organiser)
- `POST /api/shows` — Schedule show & **automatically generate `ShowSeat` matrix** (Organiser)
- `GET /api/shows/:id/seats` — Fetch visual seat map with real-time statuses & pricing

### Holds, Checkout & Bookings (`/api/bookings`)
- `POST /api/bookings/hold` — Atomic multi-seat hold with 10-minute TTL (Returns 409 on conflict)
- `POST /api/bookings/release-hold` — Release held seats
- `POST /api/bookings/checkout` — Convert held seats to booked with snapshot pricing
- `GET /api/bookings/my-bookings` — Customer booking history
- `GET /api/bookings/verify/:ref` — Public admission pass verification scanner
- `PATCH /api/bookings/:id/cancel` — Cancel booking & **trigger automated waitlist cascade**

### Waitlist Management (`/api/waitlist`)
- `POST /api/waitlist/join` — Join FIFO queue for sold-out category
- `GET /api/waitlist/my-waitlist` — Fetch customer's active queues and positions
- `GET /api/waitlist/offer/:id` — Validate private claim pass & timer
- `POST /api/waitlist/claim/:id` — Claim offered seat and confirm booking

### Executive Analytics (`/api/analytics`)
- `GET /api/analytics` — Gross revenue, occupancy meters, tier breakdowns, and waitlist yields (Organiser/Admin)

---

## ⚡ Real-Time WebSocket Events (Socket.io)

- **`join:show (showId)`**: Subscribes to live room `show:<showId>`.
- **`seat:updated`**: Broadcasts single seat lock/release/booking transitions.
- **`seat:batch_updated`**: Broadcasts multi-seat array updates.
- **`join:user (userId)`**: Subscribes to private room `user:<userId>`.
- **`waitlist:offered`**: Pushes real-time toast alert when a seat opens up.

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- **Node.js**: v18+
- **MongoDB**: Running locally on `mongodb://127.0.0.1:27017/ticketnow` or MongoDB Atlas URI

### 1. Clone & Install Dependencies
```bash
# Backend Setup
cd backend
npm install
npm run seed     # Pre-populates sample venues, shows & accounts

# Frontend Setup
cd ../frontend
npm install
```

### 2. Start Servers
```bash
# Terminal 1: Backend (Port 5000)
cd backend
npm run dev

# Terminal 2: Frontend (Port 5173)
cd frontend
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/ticketnow
JWT_SECRET=ticketnow_production_jwt_secret_key_987654321
JWT_EXPIRES_IN=7d
HOLD_TTL_MINUTES=10
WAITLIST_OFFER_TTL_MINUTES=15
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000
```

---

## 🧪 Automated Test Suites

Run the end-to-end test suites covering all 12 platform milestones:

```bash
cd backend

node tests/test-models.js                # Database Models & Concurrency Indexes 
node tests/test-auth.js                  # Authentication & RBAC 
node tests/test-venues.js                # Admin Venue Grid Designer 
node tests/test-events-shows.js          # Organiser Events & Shows 
node tests/test-seatmap.js               # Visual Seat Map & Socket Sync
node tests/test-concurrency-booking.js   # Atomic Seat Holds & 409 Conflict Protection 
node tests/test-qr-email-verify.js       # Dynamic QR Passes & Email Delivery 
node tests/test-waitlist-cascade.js      # FIFO Waitlist & 15m Expiry Cascades 
node tests/test-cancellation-cascade.js  # Cancellation & Instant Cascade Trigger 
node tests/test-analytics.js             # Executive Revenue & Occupancy Analytics 
```

---

## 🔑 Pre-Seeded Demo Credentials

| Role | Email | Password | Access / Capabilities |
|---|---|---|---|
| 🎟️ **Customer** | `customer@ticketnow.local` | `password123` | Browse shows, visual seat selection, book tickets, `/my-bookings`, waitlists |
| 🧑‍💼 **Organiser** | `organiser@ticketnow.local` | `password123` | Create events, schedule shows, `/organiser/analytics` dashboard |
| 🛡️ **Admin** | `admin@ticketnow.local` | `password123` | Visual layout editor (`/admin/venues`), seat layout paint-brush, platform oversight |

## 🚀 Live Demo

* **Frontend:** [ticket-booking-system-alpha-five.vercel.app](https://ticket-booking-system-alpha-five.vercel.app/)
* **Backend:** [ticket-booking-system-4-vjbj.onrender.com](https://ticket-booking-system-4-vjbj.onrender.com)

### 🌐 Deployment

* Frontend is deployed on **Vercel**
* Backend is deployed on **Render**
