import mongoose from 'mongoose';

export const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/ticketnow';

  // 1. Try Primary URI (Atlas or custom)
  if (primaryUri) {
    try {
      console.log(`[Database] Connecting to primary MongoDB...`);
      const conn = await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
      setupConnectionListeners();
      return conn;
    } catch (primaryErr) {
      console.warn(`[Database Warning] Primary connection failed: ${primaryErr.message}`);
      if (primaryUri.includes('mongodb+srv://')) {
        console.warn(`[Database Notice] Note: If using Atlas, ensure your IP is whitelisted (0.0.0.0/0) in MongoDB Atlas Network Access.`);
      }
    }
  }

  // 2. Fallback to Local MongoDB
  try {
    console.log(`[Database] Connecting to local fallback MongoDB (${fallbackUri})...`);
    const conn = await mongoose.connect(fallbackUri, {
      serverSelectionTimeoutMS: 4000,
      socketTimeoutMS: 45000,
    });

    console.log(`[Database] MongoDB Connected (Local Fallback): ${conn.connection.host}/${conn.connection.name}`);
    setupConnectionListeners();
    return conn;
  } catch (fallbackErr) {
    console.error(`[Database Critical Error] Local MongoDB fallback also failed: ${fallbackErr.message}`);
    throw fallbackErr;
  }
};

const setupConnectionListeners = () => {
  mongoose.connection.on('error', (err) => {
    console.error(`[Database] MongoDB connection error:`, err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn(`[Database] MongoDB disconnected. Attempting reconnection...`);
  });

  mongoose.connection.on('reconnected', () => {
    console.log(`[Database] MongoDB reconnected successfully.`);
  });
};

export const getDBStatus = () => {
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  const stateCode = mongoose.connection.readyState;
  return {
    stateCode,
    stateName: states[stateCode] || 'Unknown',
    isConnected: stateCode === 1,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
};
