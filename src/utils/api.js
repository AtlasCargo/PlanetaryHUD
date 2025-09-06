// src/utils/api.js
import axios from 'axios';

// Use REACT_APP_API_URL if provided; fallback to localhost:5999
const baseURL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5999';
try { console.log('🔧 API baseURL set to:', baseURL); } catch {}

const API = axios.create({ baseURL });

// Attach token if present
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔐 Adding auth token to request:', config.url);
    
    // For dummy tokens, also send the user email
    if (token.startsWith('USER_')) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.email) {
        config.headers['x-user-email'] = user.email;
        console.log('📧 Adding user email to headers:', user.email);
      }
    }
  }
  return config;
});

export default API;
