import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testAtlasConnection = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  console.log('Connecting to MongoDB Atlas Cluster0...');

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log('====================================================');
    console.log('✓ SUCCESS: Successfully connected to MongoDB Atlas!');
    console.log(`Host: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
    console.log(`Ready State: ${conn.connection.readyState} (Connected)`);
    console.log('====================================================');

    await mongoose.connection.close();
  } catch (error) {
    console.error('====================================================');
    console.error('❌ FAILED: MongoDB Atlas connection error:');
    console.error(error.message);
    console.error('Note: If this times out or shows IP forbidden, make sure your IP is whitelisted (or 0.0.0.0/0) in MongoDB Atlas Network Access.');
    console.error('====================================================');
    process.exitCode = 1;
  }
};

testAtlasConnection();
