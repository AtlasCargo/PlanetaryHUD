// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import API from '../utils/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // On mount, check token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        API.get('/api/user')
          .then(res => {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          })
          .catch(() => logout());
      }
    }
  }, []);

  function login(email, password) {
    // Dummy login: accept any credentials and persist in localStorage
    const dummyToken = 'DUMMY_TOKEN';
    const dummyUser = { email, avatarUrl: null, hasApiKey: false };
    localStorage.setItem('token', dummyToken);
    setUser(dummyUser);
    localStorage.setItem('user', JSON.stringify(dummyUser));
    return Promise.resolve(dummyUser);
  }

  function signup(email, password) {
    // Dummy signup: accept any credentials and persist in localStorage
    const dummyToken = 'DUMMY_TOKEN';
    const dummyUser = { email, avatarUrl: null, hasApiKey: false };
    localStorage.setItem('token', dummyToken);
    setUser(dummyUser);
    localStorage.setItem('user', JSON.stringify(dummyUser));
    return Promise.resolve(dummyUser);
  }

  function logout() {
    // Clear user session
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }
  
  /**
   * Initiate Google OAuth login in a popup and handle response via postMessage.
   * Resolves with user data on success, rejects on error.
   */
  function loginWithGoogle() {
    return new Promise((resolve, reject) => {
      const width = 600;
      const height = 600;
      // Center the popup on screen
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;
      // Construct OAuth URL (ensure REACT_APP_API_URL is set to API origin)
      const base = process.env.REACT_APP_API_URL || '';
      const oauthUrl = `${base}/api/auth/google`;
      const popup = window.open(
        oauthUrl,
        'GoogleLogin',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      // Handler for postMessage from OAuth popup
      function handleMessage(event) {
        // Determine allowed origin for OAuth popup (server or proxy)
        let allowedOrigin;
        try {
          // Resolve popup URL origin
          allowedOrigin = new URL(oauthUrl, window.location.origin).origin;
        } catch {
          allowedOrigin = window.location.origin;
        }
        // Only accept messages from OAuth popup origin
        if (event.origin !== allowedOrigin) return;
        const data = event.data || {};
        // Clean up listener and popup
        window.removeEventListener('message', handleMessage);
        if (popup) popup.close();
        if (data.error) {
          reject(new Error(data.error));
        } else if (data.token && data.user) {
          // Save token and update user context
          localStorage.setItem('token', data.token);
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
          resolve(data.user);
        } else {
          reject(new Error('Google login failed'));
        }
      }
      // Listen for messages from the popup
      window.addEventListener('message', handleMessage);
    });
  }
  
  /**
   * Initiate GitHub OAuth login in a popup and handle response via postMessage.
   * Resolves with user data on success, rejects on error.
   */
  function loginWithGithub() {
    return new Promise((resolve, reject) => {
      const width = 600;
      const height = 600;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;
      const base = process.env.REACT_APP_API_URL || '';
      const oauthUrl = `${base}/api/auth/github`;
      const popup = window.open(
        oauthUrl,
        'GitHubLogin',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      function handleMessage(event) {
        let allowedOrigin;
        try {
          allowedOrigin = new URL(oauthUrl, window.location.origin).origin;
        } catch {
          allowedOrigin = window.location.origin;
        }
        if (event.origin !== allowedOrigin) return;
        const data = event.data || {};
        window.removeEventListener('message', handleMessage);
        if (popup) popup.close();
        if (data.error) {
          reject(new Error(data.error));
        } else if (data.token && data.user) {
          localStorage.setItem('token', data.token);
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
          resolve(data.user);
        } else {
          reject(new Error('GitHub login failed'));
        }
      }
      window.addEventListener('message', handleMessage);
    });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        // derived flag for easier checks
        isLoggedIn: !!user,
        login,
        signup,
        logout,
        setUser,
        // OAuth logins
        loginWithGoogle,
        loginWithGithub,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}