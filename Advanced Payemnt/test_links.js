const jwt = require('jsonwebtoken');
const axios = require('axios');

const secret = 'a8f9d2c4b7e1f6a9c3d5e7f1b2a4c6d8e9f0a1b3c5d7e9f1a2b4c6d8e0f1a3';
const token = jwt.sign({
  merchant_id: 'ef7ce55b-8f0b-4ddf-ba4d-f118b2e4817c',
  token_version: 100,
  exp: Math.floor(Date.now() / 1000) + 3600
}, secret);

axios.get('http://localhost:8081/api/v1/payment-links', {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => {
  console.log(JSON.stringify(res.data, null, 2));
}).catch(err => console.error(err.response ? err.response.data : err.message));
