import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { maskMongoUri } from '../src/config/db.js';

dotenv.config();

const runDiagnosis = async () => {
  console.log('====================================================');
  console.log('🔍 MongoDB & Atlas Diagnostic Tool');
  console.log('====================================================\n');

  const rawUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!rawUri) {
    console.error('❌ FATAL: Neither MONGO_URI nor MONGODB_URI is defined in process.env!');
    console.error('   Please check your .env file or Render Environment Variables.\n');
    process.exit(1);
  }

  const maskedUri = maskMongoUri(rawUri);
  console.log(`[1/4] MONGO_URI Detected: ${maskedUri}`);

  // 1. URI Structural Validation
  console.log('\n[2/4] Validating URI Structure:');
  const isSrv = rawUri.startsWith('mongodb+srv://');
  const isStandard = rawUri.startsWith('mongodb://');

  if (!isSrv && !isStandard) {
    console.error('  ❌ Protocol Invalid: Must start with "mongodb+srv://" or "mongodb://"');
  } else {
    console.log(`  ✓ Protocol: ${isSrv ? 'mongodb+srv:// (Atlas SRV)' : 'mongodb://'}`);
  }

  // Check Database Name in URI
  const pathPart = rawUri.split('?')[0].split('/').slice(3).join('/');
  if (!pathPart) {
    console.warn('  ⚠️ Warning: No explicit database name found in URI (e.g. /ticketnow). Mongoose defaults to "test".');
  } else {
    console.log(`  ✓ Database Name: "${pathPart}"`);
  }

  // Check Query Parameters
  const queryPart = rawUri.includes('?') ? rawUri.split('?')[1] : '';
  const hasRetryWrites = queryPart.includes('retryWrites=true');
  const hasMajority = queryPart.includes('w=majority');
  console.log(`  ✓ Query Parameters: retryWrites=${hasRetryWrites ? 'true' : 'false'}, w=${hasMajority ? 'majority' : 'default'}`);

  // 2. DNS & SRV Resolution Test
  console.log('\n[3/4] Testing DNS Resolution for Cluster Host:');
  if (isSrv) {
    const host = rawUri.replace('mongodb+srv://', '').split('/')[0].split('@').pop().split('?')[0];
    console.log(`  Host extracted: ${host}`);

    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      const srvRecords = await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
      console.log(`  ✓ SRV Lookup Success: Resolved ${srvRecords.length} MongoDB Atlas replica node(s):`);
      srvRecords.forEach(r => console.log(`    - ${r.name}:${r.port} (Priority: ${r.priority}, Weight: ${r.weight})`));
    } catch (dnsErr) {
      console.error(`  ❌ DNS / SRV Resolution Error: ${dnsErr.message}`);
      console.error(`     Code: ${dnsErr.code}`);
      console.error('     👉 On Render, ensure your cluster hostname is spelled correctly.');
    }
  }

  // 3. Isolated Mongoose Connection Handshake
  console.log('\n[4/4] Executing Isolated Mongoose Connection Handshake:');
  try {
    const startTime = Date.now();
    const conn = await mongoose.connect(rawUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    const elapsed = Date.now() - startTime;

    console.log(`\n🎉 ====================================================`);
    console.log(`✓ SUCCESS: MongoDB connection established in ${elapsed}ms!`);
    console.log(`  Host:        ${conn.connection.host}`);
    console.log(`  Port:        ${conn.connection.port}`);
    console.log(`  Database:    ${conn.connection.name}`);
    console.log(`  Ready State: ${conn.connection.readyState} (Connected)`);
    console.log(`====================================================\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ ====================================================`);
    console.error(`CONNECTION FAILED`);
    console.error(`====================================================`);
    console.error(`Error Name:    ${err.name}`);
    console.error(`Error Message: ${err.message}`);
    console.error(`Error Code:    ${err.code || err.codeName || 'N/A'}`);

    if (err.reason) {
      console.error(`Topology Reason:`);
      console.dir(err.reason, { depth: 3 });
    }

    console.error(`\nFULL RAW ERROR OBJECT:`);
    console.dir(err, { depth: 6, colors: true });

    console.error(`\n📋 RENDER / ATLAS ACTIONABLE CHECKLIST:`);
    console.error(`1. On Render Dashboard: Go to Environment Variables -> verify MONGO_URI is set with no quotes or extra spaces.`);
    console.error(`2. In MongoDB Atlas: Go to Security -> Network Access -> confirm 0.0.0.0/0 is listed with Status: Active.`);
    console.error(`3. In MongoDB Atlas: Go to Security -> Database Access -> confirm the user exists and has "Read and write to any database" role.`);
    console.error(`4. Password Check: If the password contains characters like @, #, $, %, &, +, ?, URL-encode them (e.g. @ -> %40).`);
    console.error(`====================================================\n`);

    process.exit(1);
  }
};

runDiagnosis();
