import mongoose from 'mongoose';
import dns from 'dns';

/**
 * Mask password in connection URI for safe logging
 */
export const maskMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '<empty or not a string>';
  try {
    return uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:********@');
  } catch {
    return '<failed to format URI>';
  }
};

export const connectDB = async () => {
  // 1. Read strictly from environment variable
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ticketnow';

  const masked = maskMongoUri(mongoUri);
  const isAtlas = mongoUri.includes('mongodb+srv://') || mongoUri.includes('.mongodb.net');
  const targetLabel = isAtlas ? 'MongoDB Atlas' : 'MongoDB';

  console.log(`====================================================`);
  console.log(`[Database] Target: ${targetLabel}`);
  console.log(`[Database] Configured URI: ${masked}`);
  console.log(`====================================================`);

  // Ensure Node DNS resolver is robust for cloud environments (Render / Docker)
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch (dnsErr) {
    // Non-fatal if system prevents setting custom DNS servers
  }

  try {
    console.log(`[Database] Initiating connection handshake to ${targetLabel}...`);
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    console.log(`[Database] ✓ SUCCESS: ${targetLabel} Connected!`);
    console.log(`[Database] Host: ${conn.connection.host}`);
    console.log(`[Database] Database: ${conn.connection.name}`);
    console.log(`[Database] Ready State: ${conn.connection.readyState} (Connected)`);
    console.log(`====================================================`);

    setupConnectionListeners();
    return conn;
  } catch (error) {
    console.error(`\n====================================================`);
    console.error(`[Database Critical Failure] ${targetLabel} Connection Failed`);
    console.error(`  URI Attempted: ${masked}`);
    console.error(`  Error Name:    ${error.name}`);
    console.error(`  Error Message: ${error.message}`);
    console.error(`  Error Code:    ${error.code || error.codeName || 'N/A'}`);
    
    // Categorize common Atlas failure causes for immediate developer feedback
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed') || error.code === 18 || error.code === 8000) {
      console.error(`\n  👉 Root Cause: AUTHENTICATION ERROR`);
      console.error(`     - The username or password in MONGO_URI is incorrect.`);
      console.error(`     - If the password contains special characters (@, :, /, #, %, ?), URL-encode them.`);
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ESERVFAIL') || error.message.includes('querySrv')) {
      console.error(`\n  👉 Root Cause: DNS / SRV RESOLUTION ERROR`);
      console.error(`     - Node.js cannot resolve the Atlas cluster hostname via DNS.`);
      console.error(`     - Verify the cluster subdomain in the URI is valid.`);
    } else if (error.message.includes('SSL alert') || error.message.includes('tlsv1 alert') || error.message.includes('timed out after 10000 ms') || error.message.includes('Server selection timed out')) {
      console.error(`\n  👉 Root Cause: NETWORK / IP ACCESS LIST TIMEOUT`);
      console.error(`     - MongoDB Atlas is blocking incoming connections.`);
      console.error(`     - Ensure 0.0.0.0/0 is set to ACTIVE in Atlas > Security > Network Access.`);
      console.error(`     - Confirm your Atlas cluster is not paused / suspended.`);
    }

    console.error(`\n  Raw Error Object:`);
    console.dir(error, { depth: 5, colors: true });
    console.error(`====================================================\n`);
    throw error;
  }
};

const setupConnectionListeners = () => {
  mongoose.connection.on('error', (err) => {
    console.error(`[Database] MongoDB runtime error:`, err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn(`[Database] MongoDB disconnected.`);
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
