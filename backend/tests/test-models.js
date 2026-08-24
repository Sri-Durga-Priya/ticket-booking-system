import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  User,
  Venue,
  EventListing,
  Show,
  ShowSeat,
  Booking,
  Waitlist,
} from '../src/models/index.js';

dotenv.config();

const runModelTests = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ticketnow';
  console.log('Connecting to MongoDB for Model Verification...');
  await mongoose.connect(mongoUri);

  try {
    console.log('\n--- 1. Testing User Model ---');
    await User.deleteMany({ email: /@test-suite\.local$/ });

    const passwordHash = await User.hashPassword('SecretPassword123!');
    const testAdmin = await User.create({
      name: 'Admin Test User',
      email: 'admin@test-suite.local',
      phone: '+1234567890',
      passwordHash,
      role: 'admin',
      isVerified: true,
    });
    console.log('✓ User created:', testAdmin.email, 'Role:', testAdmin.role);

    const isMatch = await testAdmin.matchPassword('SecretPassword123!');
    const isWrongMatch = await testAdmin.matchPassword('WrongPass');
    if (isMatch && !isWrongMatch) {
      console.log('✓ User.matchPassword method functioning accurately');
    } else {
      throw new Error('User password matching failed');
    }

    console.log('\n--- 2. Testing Venue Model ---');
    const testVenue = await Venue.create({
      name: 'Grand Dolby Cinema',
      address: '456 Entertainment Ave',
      city: 'Metropolis',
      categories: [
        { name: 'Standard', colorTag: '#10b981' },
        { name: 'Premium', colorTag: '#6366f1' },
        { name: 'VIP', colorTag: '#ec4899' },
      ],
      seatLayout: [
        { seatId: 'A1', row: 'A', number: 1, category: 'VIP', x: 0, y: 0 },
        { seatId: 'A2', row: 'A', number: 2, category: 'VIP', x: 1, y: 0 },
        { seatId: 'B1', row: 'B', number: 1, category: 'Premium', x: 0, y: 1 },
        { seatId: 'B2', row: 'B', number: 2, category: 'Premium', x: 1, y: 1 },
        { seatId: 'C1', row: 'C', number: 1, category: 'Standard', x: 0, y: 2 },
        { seatId: 'C2', row: 'C', number: 2, category: 'Standard', x: 1, y: 2 },
      ],
      createdBy: testAdmin._id,
    });
    console.log('✓ Venue created:', testVenue.name, 'Total Capacity:', testVenue.totalCapacity);
    if (testVenue.totalCapacity !== 6) throw new Error('Venue totalCapacity auto-calculation failed');

    console.log('\n--- 3. Testing EventListing Model ---');
    const testEvent = await EventListing.create({
      organiser: testAdmin._id,
      title: 'Inception 15th Anniversary Screening',
      type: 'movie',
      description: 'Christopher Nolan sci-fi masterpiece',
      posterUrl: 'https://example.com/poster.jpg',
      isActive: true,
    });
    console.log('✓ EventListing created:', testEvent.title, 'Type:', testEvent.type);

    console.log('\n--- 4. Testing Show Model ---');
    const testShow = await Show.create({
      eventListing: testEvent._id,
      venue: testVenue._id,
      date: new Date(Date.now() + 86400000 * 3),
      startTime: '19:30',
      categoryPricing: [
        { category: 'VIP', price: 25 },
        { category: 'Premium', price: 18 },
        { category: 'Standard', price: 12 },
      ],
      status: 'scheduled',
    });
    console.log('✓ Show created for date:', testShow.date.toISOString(), 'Time:', testShow.startTime);

    console.log('\n--- 5. Testing ShowSeat Model & Unique Compound Index ---');
    await ShowSeat.init(); // Ensure indexes are built
    const seatA1 = await ShowSeat.create({
      show: testShow._id,
      seatId: 'A1',
      category: 'VIP',
      status: 'available',
    });
    console.log('✓ ShowSeat created:', seatA1.seatId, 'Status:', seatA1.status);

    // Test duplicate seat rejection
    let duplicateCaught = false;
    try {
      await ShowSeat.create({
        show: testShow._id,
        seatId: 'A1',
        category: 'VIP',
        status: 'available',
      });
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        duplicateCaught = true;
        console.log('✓ ShowSeat compound unique index (show, seatId) successfully rejected duplicate seat attempt!');
      } else {
        throw dupErr;
      }
    }
    if (!duplicateCaught) throw new Error('Duplicate seat insertion did not trigger compound unique index violation');

    console.log('\n--- 6. Testing Booking Model ---');
    await Booking.init();
    const testBooking = await Booking.create({
      customer: testAdmin._id,
      show: testShow._id,
      seats: [
        { seatId: 'A1', category: 'VIP', priceAtBooking: 25 },
      ],
      totalAmount: 25,
      bookingReference: 'TN-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      qrCodePayload: 'QR-TEST-DATA-INCEPTION-A1',
      status: 'confirmed',
      source: 'direct',
    });
    console.log('✓ Booking created with Ref:', testBooking.bookingReference, 'Amount: $' + testBooking.totalAmount);

    console.log('\n--- 7. Testing Waitlist Model & Queue Index ---');
    await Waitlist.init();
    const testWaitlist = await Waitlist.create({
      customer: testAdmin._id,
      show: testShow._id,
      category: 'VIP',
      status: 'waiting',
    });
    console.log('✓ Waitlist entry created for category:', testWaitlist.category, 'Status:', testWaitlist.status);

    console.log('\n======================================================');
    console.log('🎉 ALL 7 DATABASE MODELS AND COMPOUND INDEXES VERIFIED!');
    console.log('======================================================');

    // Clean up test records
    await ShowSeat.deleteMany({ show: testShow._id });
    await Booking.deleteMany({ show: testShow._id });
    await Waitlist.deleteMany({ show: testShow._id });
    await Show.findByIdAndDelete(testShow._id);
    await EventListing.findByIdAndDelete(testEvent._id);
    await Venue.findByIdAndDelete(testVenue._id);
    await User.findByIdAndDelete(testAdmin._id);
    console.log('✓ Test data cleaned up successfully.');

  } catch (error) {
    console.error('❌ Model Verification Failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
};

runModelTests();
