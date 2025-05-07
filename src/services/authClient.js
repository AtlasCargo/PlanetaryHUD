// src/services/authClient.js
// Lightweight wrapper around the server-side auth endpoints.

const BASE = '/api';

async function jsonFetch(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include'
  });

  let data;
  try { data = await res.json(); } catch (_) { /* ignore */ }

  if (!res.ok) {
    const msg = (data && data.error) || res.statusText || 'Request failed';
    throw new Error(msg);
  }

  return data;
}

export const signup = (email, password) =>
  jsonFetch('/auth/signup', { method: 'POST', body: { email, password } });

export const login = (email, password) =>
  jsonFetch('/auth/login', { method: 'POST', body: { email, password } });

export const checkEmail = (email) =>
  jsonFetch('/auth/check-email', { method: 'POST', body: { email } });

export const getMe = (token) =>
  jsonFetch('/user', { token });

// Helpers for OAuth pop-ups --------------------------------------------------

export function openOAuthPopup(provider) {
  const width = 500;
  const height = 600;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  const url = `/api/auth/${provider}`;
  return window.open(
    url,
    `${provider}-oauth`,
    `width=${width},height=${height},left=${left},top=${top}`
  );
}