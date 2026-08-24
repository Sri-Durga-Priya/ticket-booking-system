# TicketNow — System Design Document

**Author:** DeepMind Antigravity  
**Tech Stack:** Node.js, Express, MongoDB, Socket.io, React (Vite)  
**Scope:** Concurrency-Safe Seat Reservation, Time-Boxed Holds, Real-Time Sync & Automated Cascading Waitlists  

---

## 1. Seat Hold & TTL Mechanism

The seat reservation system adheres to a deterministic state lifecycle:
$$\text{available} \longrightarrow \text{held (TTL countdown)} \longrightarrow \text{booked}$$

When a user selects seats on the Visual Seat Map, a multi-seat atomic hold is initiated with an expiration timestamp calculated as `holdExpiresAt = now + HOLD_TTL_MINUTES` (default: 10 minutes).

### Dual-Layer Expiry Architecture
To ensure real-time responsiveness without sacrificing consistency, TicketNow implements a **hybrid active sweeper and lazy evaluation pattern**:

1. **Active Background Sweeper (`sweepExpiredHolds`)**: A `node-cron` scheduled worker runs every 10 seconds. It identifies seats where `status == 'held'` and `holdExpiresAt < new Date()`, updates their status back to `available`, and broadcasts a `seat:batch_updated` event over Socket.io to the relevant show room (`show:<showId>`).
2. **Lazy Safety Net**: All read operations (such as `GET /api/shows/:id/seats`) and write operations evaluate `holdExpiresAt < now` directly within their database filters. Stale holds are automatically ignored, preventing abandoned sessions from ever blocking legitimate checkout attempts even under network latency.

---

## 2. Concurrency Prevention Approach

Preventing double-booking during high-demand ticket sales is the core engineering challenge. TicketNow enforces **hard database-level atomic conditional updates** combined with a **compound unique constraint**.

### The Chosen Pattern: Atomic Conditional `findOneAndUpdate`
Rather than relying on distributed locks (e.g. Redlock) or in-memory mutexes which introduce multi-server synchronization overhead and single-point failures, we leverage MongoDB document-level write atomicity:

```javascript
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
  {
    $set: {
      status: 'held',
      heldBy: customerId,
      holdExpiresAt: new Date(Date.now() + HOLD_TTL_MINUTES * 60000)
    },
    $inc: { version: 1 }
  },
  { new: true }
);
```

### Multi-Seat Transactional Integrity
When a customer reserves multiple seats simultaneously:
- Each seat is evaluated atomically against the conditional filter.
- If any contested seat is held by a competing transaction, the operation immediately aborts, all previously acquired holds in that request are **rolled back**, and the API returns a **`409 Conflict — Seat(s) already taken`** status.
- A **Unique Compound Index** on `ShowSeat.(show, seatId)` guarantees that two instances of the same seat can never exist for a single show.

---

## 3. Waitlist Auto-Assignment & Cascading Flow

When a seating tier reaches 100% capacity, customer demand is captured via the `Waitlist` queue.

### FIFO Ordering
Entries are indexed using a compound queue index:
```
Waitlist.index({ show: 1, category: 1, status: 1, joinedAt: 1 })
```
This enables sub-millisecond retrieval of the oldest waiting candidate for any `(show, category)` tuple.

### Instant Cancellation Trigger
When a customer cancels a booking via `PATCH /api/bookings/:id/cancel`:
1. The cancelled booking is marked `status = 'cancelled'`.
2. The associated seats are released.
3. For each freed seat, `assignSeatToNextInWaitlist` immediately queries the waitlist queue for that category.
4. The `#1` candidate is transitioned to `status = 'offered'`, the `ShowSeat` is placed into a `held` state reserved exclusively for that customer, and a private 15-minute claim token is generated.
5. The customer is notified via a direct WebSocket push (`waitlist:offered`) and an automated HTML email with a private claim pass.

---

## 4. Time-Limited Offer Handling & Cascading Expiry

Waitlist seat offers are valid for a strictly bounded duration (`WAITLIST_OFFER_TTL_MINUTES`, default: 15 minutes).

### Cascading Workflow
1. If the candidate claims the ticket within 15 minutes via `POST /api/waitlist/claim/:id`, the seat is booked with `source = 'waitlist'` and the entry status is marked `claimed`.
2. If the 15-minute window expires without a claim, the scheduled sweep worker (`sweepExpiredWaitlistOffers`, running every 15s):
   - Marks the current waitlist entry as `expired`.
   - **Immediately cascades the seat** to the next customer in the queue by triggering `assignSeatToNextInWaitlist`.
   - If the queue is empty, the seat is released back to the general `available` pool.

---

## 5. Pricing Snapshot Integrity

To protect historical financial records from subsequent organiser price adjustments, `Booking.seats` stores a frozen snapshot:
```javascript
seats: [{
  seatId: "A1",
  category: "VIP Recliner",
  priceAtBooking: 28
}]
```
Historical revenue queries, refunds, and ticket passes read directly from `priceAtBooking` rather than querying current show prices.
