// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import API from '../utils/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  
  // Helper function to clear all user-specific data
  function clearUserData() {
    console.log('🧹 Starting data cleanup...');
    
    // Clear all Ideologram data
    const ideologramKeys = [
      'ideologram:library',
      'ideologram:enriched', 
      'ideologram:scores:v1',
      'ideologram:assessments',
      'ideologram:chat-history'
    ];
    
    ideologramKeys.forEach(key => {
      const hadData = localStorage.getItem(key);
      if (hadData) {
        console.log(`🗑️  Clearing ${key}:`, hadData.substring(0, 100) + '...');
        localStorage.removeItem(key);
      }
    });
    
    // Clear any other user-specific data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('ideologram:') || 
        key.startsWith('user_') || 
        key.includes('ideologram') ||
        key.startsWith('USER_') ||
        key.includes('session')
      )) {
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      console.log('🗑️  Additional keys to remove:', keysToRemove);
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    
    console.log('🧹 Data cleanup complete. Current localStorage keys:', Object.keys(localStorage));
  }

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
    // Clear any existing user data first
    clearUserData();
    
    // Generate unique token for this user session
    const uniqueToken = `USER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const uniqueUser = { 
      id: uniqueToken, 
      email, 
      avatarUrl: null, 
      hasApiKey: false,
      sessionId: uniqueToken 
    };
    
    localStorage.setItem('token', uniqueToken);
    setUser(uniqueUser);
    localStorage.setItem('user', JSON.stringify(uniqueUser));
    
    console.log('🔐 User logged in:', { email, sessionId: uniqueToken });
    
    // Verify data cleanup worked
    setTimeout(() => {
      checkIdeologramData();
    }, 100);
    
    return Promise.resolve(uniqueUser);
  }

  function signup(email, password) {
    // Clear any existing user data first
    clearUserData();
    
    // Generate unique token for this user session
    const uniqueToken = `USER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const uniqueUser = { 
      id: uniqueToken, 
      email, 
      avatarUrl: null, 
      hasApiKey: false,
      sessionId: uniqueToken 
    };
    
    localStorage.setItem('token', uniqueToken);
    setUser(uniqueUser);
    localStorage.setItem('user', JSON.stringify(uniqueUser));
    
    console.log('🔐 User signed up:', { email, sessionId: uniqueToken });
    return Promise.resolve(uniqueUser);
  }

  function logout() {
    // Clear user session
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear all user-specific data
    clearUserData();
    
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
  
  // Helper function to get user-specific storage keys
  function getUserStorageKey(baseKey) {
    if (!user || !user.sessionId) return baseKey;
    return `${baseKey}:${user.sessionId}`;
  }
  
  // Helper function to clear current user's data only
  function clearCurrentUserData() {
    if (!user || !user.sessionId) return;
    
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(user.sessionId)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('🧹 Cleared current user data:', user.email);
  }
  
  // Helper function to check what Ideologram data exists
  function checkIdeologramData() {
    const ideologramKeys = [
      'ideologram:library',
      'ideologram:enriched', 
      'ideologram:scores:v1',
      'ideologram:assessments',
      'ideologram:chat-history'
    ];
    
    const existingData = {};
    ideologramKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          existingData[key] = {
            hasData: true,
            type: typeof parsed,
            isArray: Array.isArray(parsed),
            length: Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length,
            preview: JSON.stringify(parsed).substring(0, 100) + '...'
          };
        } catch (e) {
          existingData[key] = { hasData: true, error: 'Invalid JSON' };
        }
      } else {
        existingData[key] = { hasData: false };
      }
    });
    
    console.log('📊 Current Ideologram data status:', existingData);
    return existingData;
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
        // Helper functions
        getUserStorageKey,
        clearCurrentUserData,
        checkIdeologramData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}