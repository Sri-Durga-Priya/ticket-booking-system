import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testTls = async () => {
  const uri = process.env.MONGODB_URI;
  console.log('Testing URI:', uri.replace(/:[^:@]+@/, ':****@'));

  try {
    const conn = await mongoose.connect(uri, {
      tls: true,
      serverSelectionTimeoutMS: 8000,
    });
    console.log('✓ SUCCESS: Connected to Atlas!');
    await mongoose.connection.close();
  } catch (err) {
    console.error('Connection Result:', err.message);
    if (err.message.includes('SSL alert') || err.message.includes('tlsv1 alert')) {
      console.log('\n======================================================');
      console.log('📌 DIAGNOSIS: Atlas IP Access List Whitelisting Required');
      console.log('Atlas returns TLS Alert 80 when the incoming IP address');
      console.log('is blocked by MongoDB Atlas Network Access rules.');
      console.log('======================================================');
    }
  }
};

testTls();
