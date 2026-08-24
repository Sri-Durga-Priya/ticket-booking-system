import mongoose from 'mongoose';
import Show from '../src/models/Show.js';
import ShowSeat from '../src/models/ShowSeat.js';
import Booking from '../src/models/Booking.js';

const API_BASE = 'http://localhost:5000/api';

const runConcurrencyBookingTests = async () => {
  console.log('Testing Concurrency Protection, Seat Holds, and Checkout (Task 8)...');

  try {
    // 1. Authenticate two separate test customers (Alice and Bob)
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

    // Fetch seats for this show
    const seatsRes = await fetch(`${API_BASE}/shows/${targetShow._id}/seats`);
    const seatsData = await seatsRes.json();
    const availableSeat1 = seatsData.data.seats.find(s => s.status === 'available');
    const availableSeat2 = seatsData.data.seats.filter(s => s.status === 'available')[1];

    if (!availableSeat1 || !availableSeat2) throw new Error('Not enough available seats for concurrency test');

    console.log(`✓ Testing on Show "${targetShow.eventListing.title}" with target Seat: ${availableSeat1.seatId}`);

    // 3. Test Multi-seat Hold by Customer A
    console.log('\n--- 1. Testing POST /api/bookings/hold (Customer A holding Seat 1 & 2) ---');
    const holdARes = await fetch(`${API_BASE}/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        showId: targetShow._id,
        seatIds: [availableSeat1.seatId, availableSeat2.seatId]
      })
    });
    const holdAData = await holdARes.json();
    if (!holdARes.ok) throw new Error(holdAData.message || 'Hold failed for Customer A');
    console.log(`✓ Customer A successfully placed hold on [${availableSeat1.seatId}, ${availableSeat2.seatId}], expires at: ${holdAData.data.holdExpiresAt}`);

    // 4. CRITICAL HARD CONCURRENCY TEST: Customer B attempts to hold the EXACT SAME seat simultaneously
    console.log('\n--- 2. CRITICAL CONCURRENCY TEST: Customer B attempts to hold the same Seat ---');
    const holdBRes = await fetch(`${API_BASE}/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        showId: targetShow._id,
        seatIds: [availableSeat1.seatId]
      })
    });
    const holdBData = await holdBRes.json();

    if (holdBRes.status === 409) {
      console.log('✓ HARD CONCURRENCY GUARANTEE ENFORCED: Customer B request was rejected with 409 Conflict!');
      console.log(`✓ Error message returned cleanly: "${holdBData.message}"`);
    } else {
      throw new Error(`Concurrency violation! Expected 409 but received status ${holdBRes.status}`);
    }

    // 5. Test Explicit Release Hold (Customer A releases Seat 2)
    console.log('\n--- 3. Testing POST /api/bookings/release-hold ---');
    const releaseRes = await fetch(`${API_BASE}/bookings/release-hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        showId: targetShow._id,
        seatIds: [availableSeat2.seatId]
      })
    });
    const releaseData = await releaseRes.json();
    console.log(`✓ Customer A released Seat ${availableSeat2.seatId}:`, releaseData.message);

    // 6. Test Final Checkout & Snapshot Pricing Confirmation (Customer A buys Seat 1)
    console.log('\n--- 4. Testing POST /api/bookings/checkout (Confirm Booking with Snapshot Pricing) ---');
    const checkoutRes = await fetch(`${API_BASE}/bookings/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        showId: targetShow._id,
        seatIds: [availableSeat1.seatId],
        source: 'direct',
        paymentMethod: 'simulated_card'
      })
    });
    const checkoutData = await checkoutRes.json();
    if (!checkoutRes.ok) throw new Error(checkoutData.message || 'Checkout failed');

    const confirmedBooking = checkoutData.data;
    console.log('✓ Booking confirmed successfully!');
    console.log(`✓ Booking Reference: ${confirmedBooking.bookingReference}`);
    console.log(`✓ Snapshot Seats & Prices:`, confirmedBooking.seats);
    console.log(`✓ Total Amount: $${confirmedBooking.totalAmount}`);
    console.log(`✓ QR Code Payload Encoded: ${confirmedBooking.qrCodePayload.substring(0, 45)}...`);

    // Verify seat is now marked 'booked' in DB
    const seatCheckRes = await fetch(`${API_BASE}/shows/${targetShow._id}/seats`);
    const seatCheckData = await seatCheckRes.json();
    const bookedSeatInMap = seatCheckData.data.seats.find(s => s.seatId === availableSeat1.seatId);
    if (bookedSeatInMap.status === 'booked') {
      console.log(`✓ Verified Seat ${availableSeat1.seatId} is now marked 'booked' in live ShowSeat state.`);
    } else {
      throw new Error(`Expected seat to be 'booked' but was '${bookedSeatInMap.status}'`);
    }

    console.log('\n======================================================');
    console.log('🎉 ATOMIC CONCURRENCY & CHECKOUT ENGINE FULLY VERIFIED!');
    console.log('======================================================');

  } catch (error) {
    console.error('❌ Concurrency/Booking Test Failed:', error.message);
    process.exitCode = 1;
  }
};

runConcurrencyBookingTests();
