import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'http://localhost:5000/api/auth';

const runAuthTests = async () => {
  console.log('Testing TicketNow Authentication System...');

  try {
    // 1. Fetch Demo Accounts
    console.log('\n--- 1. Testing GET /api/auth/demo-accounts ---');
    const demoRes = await fetch(`${API_BASE}/demo-accounts`);
    const demoData = await demoRes.json();
    console.log('✓ Demo Accounts:', demoData.data.accounts.map(a => `${a.role}: ${a.email}`).join(', '));

    // 2. Login Admin
    console.log('\n--- 2. Testing POST /api/auth/login (Admin) ---');
    const adminLoginRes = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ticketnow.local', password: 'password123' })
    });
    const adminData = await adminLoginRes.json();
    if (!adminLoginRes.ok || !adminData.data.token) throw new Error('Admin login failed');
    console.log('✓ Admin login successful! Role:', adminData.data.user.role, 'Token received.');

    // 3. Verify /api/auth/me with Admin Token
    console.log('\n--- 3. Testing GET /api/auth/me (Protected Route) ---');
    const meRes = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${adminData.data.token}` }
    });
    const meData = await meRes.json();
    if (!meRes.ok || meData.data.user.email !== 'admin@ticketnow.local') throw new Error('/api/auth/me failed');
    console.log('✓ /api/auth/me verified:', meData.data.user.name, `(${meData.data.user.role})`);

    // 4. Test Customer Login
    console.log('\n--- 4. Testing POST /api/auth/login (Customer) ---');
    const custLoginRes = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@ticketnow.local', password: 'password123' })
    });
    const custData = await custLoginRes.json();
    if (!custLoginRes.ok || custData.data.user.role !== 'customer') throw new Error('Customer login failed');
    console.log('✓ Customer login successful! Role:', custData.data.user.role);

    // 5. Test Register New User
    console.log('\n--- 5. Testing POST /api/auth/register (New Organiser) ---');
    const uniqueEmail = `test_org_${Date.now()}@ticketnow.local`;
    const regRes = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Paramount Stage Live',
        email: uniqueEmail,
        phone: '+1 555-900-1122',
        password: 'SecurePass123!',
        role: 'organiser'
      })
    });
    const regData = await regRes.json();
    if (!regRes.ok || regData.data.user.role !== 'organiser') throw new Error('Register failed');
    console.log('✓ Registered new organiser:', regData.data.user.email, 'Role:', regData.data.user.role);

    console.log('\n======================================================');
    console.log('🎉 AUTHENTICATION AND ROLE SYSTEM FULLY VERIFIED!');
    console.log('======================================================');
  } catch (error) {
    console.error('❌ Auth Test Failed:', error.message);
    process.exitCode = 1;
  }
};

runAuthTests();
