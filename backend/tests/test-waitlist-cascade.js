import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Booking, Show, ShowSeat, Waitlist, User } from '../src/models/index.js';
import { assignSeatToNextInWaitlist, sweepExpiredWaitlistOffers } from '../src/services/waitlistService.js';

dotenv.config();
const API_BASE = 'http://localhost:5000/api';

const runWaitlistTests = async () => {
  console.log('Testing Waitlist & Automated Cascading Reassignment (Task 10)...');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ticketnow');

    // 1. Authenticate two test customers (Customer A = Bob, Customer B = Customer)
    const custARes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bob@ticketnow.local', password: 'password123' })
    });
    const custA = await custARes.json();
    const tokenA = custA.data.token;

    const custBRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@ticketnow.local', password: 'password123' })
    });
    const custB = await custBRes.json();
    const tokenB = custB.data.token;

    // 2. Fetch a scheduled show
    const showsRes = await fetch(`${API_BASE}/shows`);
    const showsData = await showsRes.json();
    const targetShow = showsData.data[0];
    const targetCategory = targetShow.categoryPricing[0].category;

    // Clean up previous test waitlist entries for this show/category
    await Waitlist.deleteMany({ show: targetShow._id, category: targetCategory });

    console.log(`✓ Testing Show: "${targetShow.eventListing.title}" (Category: ${targetCategory})`);

    // 3. Customer A joins waitlist
    console.log('\n--- 1. Testing POST /api/waitlist/join (Customer A joins FIFO queue) ---');
    const joinARes = await fetch(`${API_BASE}/waitlist/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        showId: targetShow._id,
        category: targetCategory
      })
    });
    const joinAData = await joinARes.json();
    if (!joinARes.ok) throw new Error(joinAData.message || 'Customer A failed to join waitlist');

    console.log(`✓ Customer A joined waitlist: Queue Position #${joinAData.data.queuePosition} (ID: ${joinAData.data.waitlistId})`);
    if (joinAData.data.queuePosition !== 1) throw new Error('Expected queue position 1');

    // 4. Customer B joins waitlist (should be #2 in line)
    console.log('\n--- 2. Testing FIFO Order: Customer B joins waitlist (Queue Position #2) ---');
    const joinBRes = await fetch(`${API_BASE}/waitlist/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        showId: targetShow._id,
        category: targetCategory
      })
    });
    const joinBData = await joinBRes.json();
    console.log(`✓ Customer B joined waitlist: Queue Position #${joinBData.data.queuePosition}`);
    if (joinBData.data.queuePosition !== 2) throw new Error('Expected queue position 2 for Customer B');

    // 5. Trigger Automatic Waitlist Assignment: A seat in targetCategory becomes available
    console.log('\n--- 3. Testing Automated FIFO Assignment (Seat opens up -> Offered to #1 Customer A) ---');
    const sampleSeat = await ShowSeat.findOne({ show: targetShow._id, category: targetCategory });
    if (!sampleSeat) throw new Error('No seat found for test category');

    const offeredCandidate = await assignSeatToNextInWaitlist(targetShow._id.toString(), targetCategory, sampleSeat.seatId);
    if (!offeredCandidate || offeredCandidate.status !== 'offered') {
      throw new Error('Expected candidate to be in "offered" status');
    }
    console.log(`✓ Seat ${sampleSeat.seatId} automatically assigned to Customer A (Status: ${offeredCandidate.status}, Expires: ${offeredCandidate.offerExpiresAt})`);

    // Verify ShowSeat is now held for Customer A
    const updatedSeat = await ShowSeat.findOne({ show: targetShow._id, seatId: sampleSeat.seatId });
    if (updatedSeat.status === 'held' && updatedSeat.heldBy.toString() === custA.data.user.id) {
      console.log(`✓ Verified ShowSeat ${sampleSeat.seatId} is locked with status 'held' for Customer A`);
    } else {
      throw new Error('ShowSeat was not properly held for waitlist customer');
    }

    // 6. Test GET /api/waitlist/offer/:id
    console.log('\n--- 4. Testing GET /api/waitlist/offer/:id ---');
    const offerDetailsRes = await fetch(`${API_BASE}/waitlist/offer/${offeredCandidate._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const offerDetails = await offerDetailsRes.json();
    if (!offerDetailsRes.ok) throw new Error(offerDetails.message);
    console.log(`✓ Offer Details verified: Seat ${offerDetails.data.offeredSeat}, Category: ${offerDetails.data.category}, Price: $${offerDetails.data.price}`);

    // 7. Test Cascading Expiry: If Customer A's offer expires, does it cascade to Customer B?
    console.log('\n--- 5. Testing Cascading Reassignment on Offer Expiry ---');
    // Artificially expire Customer A's offer
    await Waitlist.findByIdAndUpdate(offeredCandidate._id, {
      $set: { offerExpiresAt: new Date(Date.now() - 5000) } // Expired 5 seconds ago
    });

    const sweepResult = await sweepExpiredWaitlistOffers();
    console.log(`✓ Sweep job executed, processed ${sweepResult.sweptCount} expired offer(s)`);

    // Verify Customer B is now in 'offered' status!
    const custBEntry = await Waitlist.findOne({ customer: custB.data.user.id, show: targetShow._id, category: targetCategory });
    if (custBEntry.status === 'offered' && custBEntry.offeredSeat === sampleSeat.seatId) {
      console.log(`✓ CASCADING VERIFIED: Seat ${sampleSeat.seatId} cascaded to Customer B (Status: ${custBEntry.status})!`);
    } else {
      throw new Error(`Cascading failed! Customer B status: ${custBEntry?.status}`);
    }

    // 8. Test Customer B Claiming the Offer (POST /api/waitlist/claim/:id)
    console.log('\n--- 6. Testing POST /api/waitlist/claim/:id (Customer B claims ticket) ---');
    const claimRes = await fetch(`${API_BASE}/waitlist/claim/${custBEntry._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      }
    });
    const claimData = await claimRes.json();
    if (!claimRes.ok) throw new Error(claimData.message || 'Claim failed');

    console.log(`✓ Waitlist offer claimed successfully! Booking Ref: ${claimData.data.bookingReference}`);
    console.log(`✓ Booking source verified: "${claimData.data.source}"`);
    console.log(`✓ Total paid: $${claimData.data.totalAmount}`);

    // Verify ShowSeat is now 'booked'
    const finalSeat = await ShowSeat.findOne({ show: targetShow._id, seatId: sampleSeat.seatId });
    if (finalSeat.status === 'booked') {
      console.log(`✓ ShowSeat ${sampleSeat.seatId} is now permanently 'booked'.`);
    } else {
      throw new Error('ShowSeat was not booked after waitlist claim');
    }

    console.log('\n======================================================');
    console.log('🎉 WAITLIST FIFO DISPATCH & CASCADING FULLY VERIFIED!');
    console.log('======================================================');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Waitlist Test Failed:', error.message);
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    process.exitCode = 1;
  }
};

runWaitlistTests();
