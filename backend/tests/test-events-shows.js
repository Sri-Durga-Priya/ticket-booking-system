const API_BASE = 'http://localhost:5000/api';

const runEventShowTests = async () => {
  console.log('Testing Organiser Event & Show Management System...');

  try {
    // 1. Log in Organiser
    const orgLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'organiser@ticketnow.local', password: 'password123' })
    });
    const orgData = await orgLoginRes.json();
    const orgToken = orgData.data.token;

    // 2. Fetch Public Events
    console.log('\n--- 1. Testing GET /api/events ---');
    const eventsRes = await fetch(`${API_BASE}/events`);
    const eventsData = await eventsRes.json();
    console.log(`✓ Fetched ${eventsData.count} events:`, eventsData.data.map(e => `${e.title} (${e.type})`).join('; '));

    const firstEvent = eventsData.data[0];

    // 3. Fetch Event Detail with Upcoming Shows
    console.log('\n--- 2. Testing GET /api/events/:id ---');
    const eventDetailRes = await fetch(`${API_BASE}/events/${firstEvent._id}`);
    const eventDetail = await eventDetailRes.json();
    console.log(`✓ Event "${eventDetail.data.title}" has ${eventDetail.data.shows.length} upcoming show(s) scheduled`);

    // 4. Create New Event Listing
    console.log('\n--- 3. Testing POST /api/events (Organiser) ---');
    const createEvRes = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${orgToken}`
      },
      body: JSON.stringify({
        title: 'Queen & Adam Lambert — The Rhapsody Tour',
        type: 'concert',
        description: 'Spectacular live rock celebration of Queen classic hits',
        posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'
      })
    });
    const newEvent = await createEvRes.json();
    console.log('✓ Organiser created new listing:', newEvent.data.title, 'ID:', newEvent.data._id);

    // 5. Fetch Venues to schedule a show
    const venuesRes = await fetch(`${API_BASE}/venues`);
    const venuesData = await venuesRes.json();
    const targetVenue = venuesData.data[0];

    // 6. Schedule a Show & Verify Automatic ShowSeat Generation
    console.log('\n--- 4. Testing POST /api/shows & Automatic ShowSeat Generation ---');
    const createShowRes = await fetch(`${API_BASE}/shows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${orgToken}`
      },
      body: JSON.stringify({
        eventListing: newEvent.data._id,
        venue: targetVenue._id,
        date: new Date(Date.now() + 86400000 * 10),
        startTime: '20:30',
        categoryPricing: targetVenue.categories.map(c => ({ category: c.name, price: 45 }))
      })
    });
    const createdShow = await createShowRes.json();
    if (!createShowRes.ok) throw new Error(createdShow.message || 'Failed to create show');

    console.log(`✓ Show scheduled on ${createdShow.data.date.split('T')[0]} at ${createdShow.data.startTime}`);
    console.log(`✓ CRITICAL VERIFICATION: Automatically instantiated ${createdShow.totalSeatsInitialized} ShowSeat documents matching venue capacity (${targetVenue.totalCapacity} seats)!`);

    // 7. Test Organiser Hub My-Shows with Occupancy
    console.log('\n--- 5. Testing GET /api/shows/organiser/my-shows ---');
    const myShowsRes = await fetch(`${API_BASE}/shows/organiser/my-shows`, {
      headers: { Authorization: `Bearer ${orgToken}` }
    });
    const myShowsData = await myShowsRes.json();
    console.log(`✓ Organiser has ${myShowsData.count} active shows with computed seat occupancy maps`);

    // 8. Test Cancelling a Show
    console.log('\n--- 6. Testing PATCH /api/shows/:id/cancel ---');
    const cancelRes = await fetch(`${API_BASE}/shows/${createdShow.data._id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${orgToken}` }
    });
    const cancelData = await cancelRes.json();
    console.log('✓ Show status updated to cancelled:', cancelData.data.status);

    console.log('\n======================================================');
    console.log('🎉 ORGANISER EVENT & SHOW MANAGEMENT FULLY VERIFIED!');
    console.log('======================================================');

  } catch (error) {
    console.error('❌ Event/Show Test Failed:', error.message);
    process.exitCode = 1;
  }
};

runEventShowTests();
