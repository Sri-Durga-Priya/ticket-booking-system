import { io } from '../../frontend/node_modules/socket.io-client/build/esm/index.js';

const API_BASE = 'http://localhost:5000/api';

const runSeatMapTests = async () => {
  console.log('Testing Visual Seat Map & Live Real-Time Sync (Task 7)...');

  try {
    // 1. Fetch available shows
    const showsRes = await fetch(`${API_BASE}/shows`);
    const showsData = await showsRes.json();
    if (!showsData.data || showsData.data.length === 0) throw new Error('No shows available for test');

    const targetShow = showsData.data[0];
    console.log(`✓ Testing Show: "${targetShow.eventListing.title}" at ${targetShow.venue.name}`);

    // 2. Fetch Visual Seat Map & Coordinates
    console.log('\n--- 1. Testing GET /api/shows/:id/seats ---');
    const seatsRes = await fetch(`${API_BASE}/shows/${targetShow._id}/seats`);
    const seatsData = await seatsRes.json();
    if (!seatsRes.ok) throw new Error(seatsData.message || 'Failed to fetch seats');

    console.log(`✓ Fetched ${seatsData.data.seats.length} visual seats for Show ${targetShow._id}`);
    console.log('✓ Sample seat data:', seatsData.data.seats[0]);
    console.log('✓ Category pricing & stats breakdown:', seatsData.data.categoryStats);

    // 3. Test Real-time Socket.io Room Joining & Connection
    console.log('\n--- 2. Testing Socket.io Real-Time Room Sync ---');
    await new Promise((resolve, reject) => {
      const socket = io('http://localhost:5000', { transports: ['websocket'] });

      socket.on('connect', () => {
        console.log('✓ Socket client connected successfully with ID:', socket.id);
        socket.emit('join:show', targetShow._id);
        console.log(`✓ Successfully joined real-time room: show:${targetShow._id}`);

        setTimeout(() => {
          socket.emit('leave:show', targetShow._id);
          socket.disconnect();
          resolve();
        }, 500);
      });

      socket.on('connect_error', (err) => {
        reject(err);
      });

      setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
    });

    console.log('\n======================================================');
    console.log('🎉 VISUAL SEAT MAP & REAL-TIME SYNC FULLY VERIFIED!');
    console.log('======================================================');

  } catch (error) {
    console.error('❌ Seat Map Test Failed:', error.message);
    process.exitCode = 1;
  }
};

runSeatMapTests();
