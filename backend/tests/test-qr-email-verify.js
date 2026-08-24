import { generateQRCodeDataUrl, sendTicketConfirmationEmail } from '../src/services/emailService.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Booking, Show, EventListing, Venue, User } from '../src/models/index.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

const runQREmailVerifyTests = async () => {
  console.log('Testing QR Code Ticket Generation, Email Delivery & Verification (Task 9)...');

  try {
    // Connect to DB for direct service verification
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ticketnow');

    // 1. Test QR Code Data URI Generator
    console.log('\n--- 1. Testing QR Code Generation ---');
    const testPayload = { ref: 'TN-TEST99', show: 'show-123', seats: ['A1', 'A2'] };
    const qrDataUrl = await generateQRCodeDataUrl(testPayload);
    if (!qrDataUrl || !qrDataUrl.startsWith('data:image/png;base64,')) {
      throw new Error('Invalid QR code data URI generated');
    }
    console.log('✓ Successfully generated QR Code Data URI (Length:', qrDataUrl.length, 'bytes)');

    // 2. Fetch existing booking for email test
    console.log('\n--- 2. Testing Nodemailer Ticket Email Delivery ---');
    const latestBooking = await Booking.findOne({ status: 'confirmed' });
    if (!latestBooking) {
      throw new Error('No confirmed booking found to test email delivery');
    }

    const emailResult = await sendTicketConfirmationEmail(latestBooking._id);
    if (!emailResult || !emailResult.success) {
      throw new Error(emailResult?.error || 'Email sending failed');
    }
    console.log(`✓ Email sent successfully! MessageID: ${emailResult.messageId}`);
    if (emailResult.previewUrl) {
      console.log(`✓ Ethereal Email Preview URL: ${emailResult.previewUrl}`);
    }

    // 3. Test Ticket Verification API Endpoint
    console.log('\n--- 3. Testing GET /api/bookings/verify/:ref (Valid Reference) ---');
    const verifyRes = await fetch(`${API_BASE}/bookings/verify/${latestBooking.bookingReference}`);
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.isValid) {
      throw new Error('Expected valid verification result');
    }
    console.log(`✓ Verified Ticket Ref "${latestBooking.bookingReference}": Valid Pass for "${verifyData.data.eventTitle}" (${verifyData.data.seats.length} seats)`);
    console.log(`✓ Attendee: ${verifyData.data.customerName} (${verifyData.data.customerEmail})`);

    // 4. Test Invalid Reference Lookup
    console.log('\n--- 4. Testing GET /api/bookings/verify/:ref (Invalid Reference) ---');
    const invalidRes = await fetch(`${API_BASE}/bookings/verify/INVALID-REF-999`);
    const invalidData = await invalidRes.json();
    if (invalidRes.status === 404 && invalidData.isValid === false) {
      console.log('✓ Successfully rejected invalid reference with 404 and isValid: false');
    } else {
      throw new Error('Expected 404 for invalid ticket reference');
    }

    console.log('\n======================================================');
    console.log('🎉 QR CODE TICKETING & VERIFICATION FULLY VERIFIED!');
    console.log('======================================================');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ QR/Email/Verify Test Failed:', error.message);
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    process.exitCode = 1;
  }
};

runQREmailVerifyTests();
