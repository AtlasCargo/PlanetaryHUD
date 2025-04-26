// src/utils/api.js
import axios from 'axios';

// Compute baseURL so that '/api' prefix in API routes is preserved without duplication.
let baseURL = '/';
if (process.env.REACT_APP_API_URL) {
  // Trim trailing slashes
  const trimmed = process.env.REACT_APP_API_URL.replace(/\/+$/, '');
  // If env var ends with '/api', strip that segment to avoid double '/api/api' when calling '/api/...'
  baseURL = trimmed.toLowerCase().endsWith('/api')
    ? trimmed.slice(0, -4)
    : trimmed;
}
const API = axios.create({ baseURL });
// Attach token if present
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;