import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Booking, Show, ShowSeat, Waitlist, User } from '../src/models/index.js';

dotenv.config();
const API_BASE = 'http://localhost:5000/api';

const runCancellationCascadeTests = async () => {
  console.log('Testing Booking Cancellation & Automatic Waitlist Cascading (Task 11)...');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ticketnow');

    // 1. Authenticate Customer A (Alice) and Customer B (Bob)
    const custARes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@ticketnow.local', password: 'password123' })
    });
    const custA = await custARes.json();
    const tokenA = custA.data.token;

    const custBRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bob@ticketnow.local', password: 'password123' })
    });
    const custB = await custBRes.json();
    const tokenB = custB.data.token;

    // 2. Fetch available show
    const showsRes = await fetch(`${API_BASE}/shows`);
    const showsData = await showsRes.json();
    const targetShow = showsData.data[0];
    const targetCategory = targetShow.categoryPricing[0].category;

    // Clean previous waitlist entries
    await Waitlist.deleteMany({ show: targetShow._id, category: targetCategory });

    // 3. Customer A books a seat
    console.log('\n--- 1. Customer A holds and books a Seat ---');
    const seatsRes = await fetch(`${API_BASE}/shows/${targetShow._id}/seats`);
    const seatsData = await seatsRes.json();
    const testSeat = seatsData.data.seats.find(s => s.status === 'available' && s.category === targetCategory);
    if (!testSeat) throw new Error('No available seat found in target category');

    // Hold
    await fetch(`${API_BASE}/bookings/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ showId: targetShow._id, seatIds: [testSeat.seatId] })
    });

    // Checkout
    const bookRes = await fetch(`${API_BASE}/bookings/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ showId: targetShow._id, seatIds: [testSeat.seatId] })
    });
    const bookData = await bookRes.json();
    const confirmedBooking = bookData.data;
    console.log(`✓ Customer A booked Seat ${testSeat.seatId} (Booking Ref: ${confirmedBooking.bookingReference})`);

    // 4. Customer B joins the waitlist for that category
    console.log('\n--- 2. Customer B joins waitlist for the category ---');
    const joinRes = await fetch(`${API_BASE}/waitlist/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ showId: targetShow._id, category: targetCategory })
    });
    const joinData = await joinRes.json();
    console.log(`✓ Customer B is on waitlist: #${joinData.data.queuePosition} in line (Status: ${joinData.data.status})`);

    // 5. Customer A cancels their booking
    console.log('\n--- 3. Customer A cancels their booking (PATCH /api/bookings/:id/cancel) ---');
    const cancelRes = await fetch(`${API_BASE}/bookings/${confirmedBooking._id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const cancelData = await cancelRes.json();
    if (!cancelRes.ok) throw new Error(cancelData.message || 'Cancellation failed');

    console.log(`✓ Cancellation response: "${cancelData.message}"`);
    console.log(`✓ Automatic waitlist offers triggered: ${cancelData.waitlistOffersTriggered}`);

    // 6. CRITICAL VERIFICATION: Check if Customer B immediately received the offer!
    console.log('\n--- 4. CRITICAL VERIFICATION: Checking Customer B Waitlist Status ---');
    const updatedCustBEntry = await Waitlist.findOne({
      customer: custB.data.user.id,
      show: targetShow._id,
      category: targetCategory
    });

    if (updatedCustBEntry.status === 'offered' && updatedCustBEntry.offeredSeat === testSeat.seatId) {
      console.log(`✓ VERIFIED: Cancelled Seat ${testSeat.seatId} was IMMEDIATELY & AUTOMATICALLY offered to waitlisted Customer B!`);
      console.log(`✓ Customer B Status: "${updatedCustBEntry.status}", Offer Expires: ${updatedCustBEntry.offerExpiresAt}`);
    } else {
      throw new Error(`Expected Customer B to be 'offered' but was '${updatedCustBEntry?.status}'`);
    }

    // 7. Verify Customer Booking History API (GET /api/bookings/my-bookings)
    console.log('\n--- 5. Testing GET /api/bookings/my-bookings ---');
    const myBookingsRes = await fetch(`${API_BASE}/bookings/my-bookings`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const myBookingsData = await myBookingsRes.json();
    const cancelledBookingInHistory = myBookingsData.data.find(b => b._id === confirmedBooking._id);
    if (cancelledBookingInHistory.status === 'cancelled') {
      console.log(`✓ Customer A booking history reflects status 'cancelled'.`);
    } else {
      throw new Error('History did not reflect cancellation');
    }

    console.log('\n======================================================');
    console.log('🎉 CANCELLATION & INSTANT WAITLIST CASCADE FULLY VERIFIED!');
    console.log('======================================================');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Cancellation Test Failed:', error.message);
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    process.exitCode = 1;
  }
};

runCancellationCascadeTests();
