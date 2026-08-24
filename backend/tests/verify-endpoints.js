const verifyEndpoints = async () => {
  console.log('--- 1. Testing GET /api/events ---');
  try {
    const evRes = await fetch('http://localhost:5000/api/events');
    const evData = await evRes.json();
    console.log('Events Status:', evRes.status);
    console.log('Events Count:', evData.data?.length);
    if (evData.data?.length > 0) {
      console.log('Sample Event:', evData.data[0].title);
    } else {
      console.warn('⚠️ No events in database!');
    }

    console.log('\n--- 2. Testing GET /api/shows ---');
    const showRes = await fetch('http://localhost:5000/api/shows');
    const showData = await showRes.json();
    console.log('Shows Status:', showRes.status);
    console.log('Shows Count:', showData.data?.length);
    if (showData.data?.length > 0) {
      console.log('Sample Show:', showData.data[0].eventListing?.title, 'at', showData.data[0].venue?.name);
    } else {
      console.warn('⚠️ No shows in database!');
    }

    console.log('\n--- 3. Testing POST /api/auth/login ---');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customer@ticketnow.local',
        password: 'password123',
      }),
    });
    const loginData = await loginRes.json();
    console.log('Login Status:', loginRes.status);
    console.log('Login Response:', loginData);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
};

verifyEndpoints();
