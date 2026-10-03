async function testLogin() {
  const url = 'http://localhost:4000/api/v1/auth/login';
  
  // 1. Test Super Admin Login
  console.log('Testing SUPER_ADMIN login...');
  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@polinela.ac.id', password: 'password123' })
  });
  let data = await res.json();
  if (res.ok && data.data.user.roles.includes('SUPER_ADMIN')) {
    console.log('✅ SUPER_ADMIN login successful!');
  } else {
    console.error('❌ SUPER_ADMIN login failed:', data);
  }

  // 2. Test ORMAWA Admin Login
  console.log('Testing ORMAWA_ADMIN login...');
  res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bem@polinela.ac.id', password: 'password123' })
  });
  data = await res.json();
  if (res.ok && data.data.user.roles.includes('ORMAWA_ADMIN') && data.data.activeTenant.code === 'BEM') {
    console.log('✅ ORMAWA_ADMIN login successful!');
  } else {
    console.error('❌ ORMAWA_ADMIN login failed:', data);
  }

  // 3. Test HMJ Admin Login
  console.log('Testing HMJ_ADMIN login...');
  res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hmjpangan@polinela.ac.id', password: 'password123' })
  });
  data = await res.json();
  if (res.ok && data.data.user.roles.includes('HMJ_ADMIN') && data.data.activeTenant.code === 'HMJ-PANGAN') {
    console.log('✅ HMJ_ADMIN login successful!');
  } else {
    console.error('❌ HMJ_ADMIN login failed:', data);
  }
}

testLogin();
