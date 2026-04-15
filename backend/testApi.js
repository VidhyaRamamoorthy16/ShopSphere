const axios = require('axios');

async function testAddToCart() {
  const baseURL = 'http://localhost:5001/api';
  
  try {
    // 1. Login to get token
    console.log('Logging in...');
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      email: 'testuser@example.com',
      password: 'Password123!'
    });
    const token = loginRes.data.token;
    console.log('Token obtained.');

    // 2. Add to cart
    console.log('Adding to cart...');
    const cartRes = await axios.post(`${baseURL}/cart/add`, 
      { product_id: 'aa2def79-4705-43e9-8fb6-d874accd20b0', quantity: 1 },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Success!', cartRes.data);
  } catch (err) {
    console.error('Error Status:', err.response?.status);
    console.error('Error Data:', err.response?.data);
    if (err.message.includes('ECONNREFUSED')) console.error('Connection refused to', err.config.url);
  }
}

testAddToCart();
