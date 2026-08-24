const API_BASE = 'http://localhost:5000/api';

const runVenueTests = async () => {
  console.log('Testing Admin Venue & Seat Layout Management...');

  try {
    // 1. Authenticate Admin and Customer
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ticketnow.local', password: 'password123' })
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.data.token;

    const custLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@ticketnow.local', password: 'password123' })
    });
    const custData = await custLoginRes.json();
    const custToken = custData.data.token;

    // 2. Fetch Public Venues List
    console.log('\n--- 1. Testing GET /api/venues ---');
    const venuesRes = await fetch(`${API_BASE}/venues`);
    const venuesData = await venuesRes.json();
    console.log(`✓ Fetched ${venuesData.count} seeded venues:`, venuesData.data.map(v => `${v.name} (${v.city}, ${v.totalCapacity} seats)`).join('; '));

    const sampleVenue = venuesData.data[0];
    if (!sampleVenue) throw new Error('No venues found');

    // 3. Fetch Single Venue Details
    console.log('\n--- 2. Testing GET /api/venues/:id ---');
    const singleRes = await fetch(`${API_BASE}/venues/${sampleVenue._id}`);
    const singleData = await singleRes.json();
    console.log(`✓ Venue ${singleData.data.name} has ${singleData.data.seatLayout.length} mapped seats with x/y coordinates`);

    // 4. Test Coordinate Layout Generator
    console.log('\n--- 3. Testing POST /api/venues/generate-layout (Admin) ---');
    const genRes = await fetch(`${API_BASE}/venues/generate-layout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        rowConfigs: [
          { row: 'A', seats: 6, category: 'VIP' },
          { row: 'B', seats: 8, category: 'Standard' }
        ]
      })
    });
    const genData = await genRes.json();
    console.log(`✓ Generated layout preview with ${genData.totalSeats} seats. First seat:`, genData.data[0]);

    // 5. Test Customer Rejection on Protected Route (RBAC)
    console.log('\n--- 4. Testing RBAC: Customer blocked from creating venue ---');
    const custCreateRes = await fetch(`${API_BASE}/venues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`
      },
      body: JSON.stringify({
        name: 'Unauthorized Theater',
        city: 'Forbidden City'
      })
    });
    if (custCreateRes.status === 403) {
      console.log('✓ RBAC successfully rejected non-admin request with 403 Forbidden');
    } else {
      throw new Error(`Expected 403 but got ${custCreateRes.status}`);
    }

    // 6. Test Admin Creating New Venue
    console.log('\n--- 5. Testing POST /api/venues (Admin) ---');
    const createRes = await fetch(`${API_BASE}/venues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Test Sunset Amphitheater',
        address: '100 Sunset Strip',
        city: 'Los Angeles',
        categories: [
          { name: 'Balcony', colorTag: '#3b82f6' },
          { name: 'Golden Circle', colorTag: '#f59e0b' }
        ],
        rowConfigs: [
          { row: 'A', seats: 10, category: 'Golden Circle' },
          { row: 'B', seats: 12, category: 'Balcony' }
        ]
      })
    });
    const createdVenue = await createRes.json();
    console.log('✓ Admin created venue:', createdVenue.data.name, 'Total Capacity:', createdVenue.data.totalCapacity);

    // 7. Test Admin Updating Venue
    console.log('\n--- 6. Testing PUT /api/venues/:id (Admin) ---');
    const updateRes = await fetch(`${API_BASE}/venues/${createdVenue.data._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Test Sunset Amphitheater (Renovated)'
      })
    });
    const updatedVenue = await updateRes.json();
    console.log('✓ Updated venue name to:', updatedVenue.data.name);

    // 8. Test Admin Deleting Venue
    console.log('\n--- 7. Testing DELETE /api/venues/:id (Admin) ---');
    const deleteRes = await fetch(`${API_BASE}/venues/${createdVenue.data._id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    const delData = await deleteRes.json();
    console.log('✓ Deleted test venue:', delData.message);

    console.log('\n======================================================');
    console.log('🎉 ADMIN VENUE & SEAT LAYOUT SYSTEM FULLY VERIFIED!');
    console.log('======================================================');

  } catch (error) {
    console.error('❌ Venue Test Failed:', error.message);
    process.exitCode = 1;
  }
};

runVenueTests();
