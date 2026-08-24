const testHealthAndRegistration = async () => {
  console.log('--- 1. Testing GET http://localhost:5000/api/health ---');
  try {
    const healthRes = await fetch('http://localhost:5000/api/health');
    const healthData = await healthRes.json();
    console.log('HTTP Status:', healthRes.status);
    console.log('Response Body:', healthData);

    if (healthData.status === 'ok' && healthData.dbConnected === true) {
      console.log('✓ SUCCESS: Backend is running and MongoDB is connected (dbConnected: true)');
    } else {
      console.error('❌ FAILED: dbConnected is false or status is not ok');
      process.exitCode = 1;
      return;
    }

    console.log('\n--- 2. Testing POST http://localhost:5000/api/auth/register ---');
    const testEmail = `testuser_${Date.now()}@ticketnow.local`;
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Diagnostic Tester',
        email: testEmail,
        phone: '+1 555 0199',
        password: 'password123',
        role: 'customer',
      }),
    });

    const regData = await regRes.json();
    console.log('Registration HTTP Status:', regRes.status);
    console.log('Registration Response:', regData);

    if (regRes.ok && regData.success && regData.data?.token) {
      console.log('✓ SUCCESS: User registered successfully, JWT token issued.');
    } else {
      console.error('❌ Registration failed:', regData.message);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('❌ Connection Error:', error.message);
    process.exitCode = 1;
  }
};

testHealthAndRegistration();
