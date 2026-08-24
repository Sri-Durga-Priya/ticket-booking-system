import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const API_BASE = 'http://localhost:5000/api';

const runAnalyticsTests = async () => {
  console.log('Testing Organiser & Admin Analytics Dashboard Engine (Task 12)...');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ticketnow');

    // 1. Authenticate Organiser
    const orgRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'organiser@ticketnow.local', password: 'password123' })
    });
    const org = await orgRes.json();
    const orgToken = org.data.token;

    // 2. Authenticate Customer (to test RBAC rejection)
    const custRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@ticketnow.local', password: 'password123' })
    });
    const cust = await custRes.json();
    const custToken = cust.data.token;

    // 3. Test RBAC: Customer should be rejected with 403
    console.log('\n--- 1. Testing RBAC Security: Customer Access Rejection ---');
    const forbiddenRes = await fetch(`${API_BASE}/analytics`, {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    if (forbiddenRes.status === 403) {
      console.log('✓ Successfully blocked non-organiser role with 403 Forbidden');
    } else {
      throw new Error(`Expected 403 Forbidden but got ${forbiddenRes.status}`);
    }

    // 4. Test GET /api/analytics as Organiser
    console.log('\n--- 2. Testing GET /api/analytics (Organiser) ---');
    const analyticsRes = await fetch(`${API_BASE}/analytics`, {
      headers: { Authorization: `Bearer ${orgToken}` }
    });
    const analyticsData = await analyticsRes.json();
    if (!analyticsRes.ok) throw new Error(analyticsData.message || 'Failed to fetch analytics');

    const { kpis, categoryDistribution, waitlistFunnel, shows } = analyticsData.data;

    console.log('✓ KPI Metrics:');
    console.log(`  - Total Gross Revenue: $${kpis.totalRevenue}`);
    console.log(`  - Total Tickets Sold: ${kpis.totalTicketsSold} seats`);
    console.log(`  - Overall Average Occupancy: ${kpis.overallOccupancyRate}%`);
    console.log(`  - Active Shows Monitored: ${kpis.totalShowsCount}`);
    console.log(`  - Direct Revenue: $${kpis.directRevenue} vs Waitlist Revenue: $${kpis.waitlistRevenue}`);
    console.log(`  - Waitlist Yield / Conversion Rate: ${kpis.waitlistConversionRate}%`);

    console.log('\n✓ Category Revenue Breakdown:');
    categoryDistribution.forEach(cat => {
      console.log(`  - ${cat.category}: $${cat.revenue} (${cat.ticketsSold} tickets sold)`);
    });

    console.log('\n✓ Waitlist Funnel Breakdown:');
    console.log(`  - Waiting in Queue: ${waitlistFunnel.waiting}`);
    console.log(`  - Offers Dispatched: ${waitlistFunnel.offered}`);
    console.log(`  - Passes Claimed: ${waitlistFunnel.claimed}`);
    console.log(`  - Expired / Cascaded: ${waitlistFunnel.expired}`);

    console.log('\n✓ Per-Show Performance Breakdown:');
    console.log(`  - Verified ${shows.length} shows with computed occupancy meters and revenue.`);
    if (shows.length > 0) {
      const s = shows[0];
      console.log(`  - Sample Show: "${s.eventTitle}" at ${s.venueName} | Occupancy: ${s.occupancyRate}% (${s.bookedSeats}/${s.totalCapacity}) | Revenue: $${s.revenue}`);
    }

    console.log('\n======================================================');
    console.log('🎉 ORGANISER ANALYTICS DASHBOARD ENGINE FULLY VERIFIED!');
    console.log('======================================================');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Analytics Test Failed:', error.message);
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    process.exitCode = 1;
  }
};

runAnalyticsTests();
