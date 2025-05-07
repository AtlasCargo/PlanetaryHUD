// src/components/Navbar.js
import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout, loginWithGoogle } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  // Hamburger menu state
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  
  // Label for Google button based on existing auth token
  const googleBtnLabel = localStorage.getItem('token')
    ? 'Continue with Google'
    : 'Sign up with Google';
  
  return (
    <nav className="bg-gray-800 p-4 text-white flex justify-between items-center">
      {/* Removed banner */}
      <div className="flex items-center space-x-2">
        {/* Hamburger Icon */}
        <button
          onClick={() => setHamburgerOpen(open => !open)}
          className="focus:outline-none p-1"
          aria-label="Open navigation menu"
        >
          {/* Hamburger SVG */}
          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {/* Chat Icon */}
        <button
          onClick={() => {/* TODO: open chat panel */}}
          className="focus:outline-none p-1"
          aria-label="Open chat panel"
        >
          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l1.8-4.2A8.963 8.963 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>
      <div className="relative">
        {/* Hamburger Menu Dropdown */}
        {hamburgerOpen && (
          <div className="origin-top-left absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1">
              <button
                onClick={() => { setHamburgerOpen(false); /* TODO: navigate to account */ }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Account
              </button>
              <button
                onClick={() => { setHamburgerOpen(false); /* TODO: open chat */ }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Chat
              </button>
              <button
                onClick={() => { setHamburgerOpen(false); setMenuOpen(true); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Other Settings
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setMenuOpen(open => !open)}
          className="focus:outline-none"
          aria-label="Open account menu"
        >
          {/* Gear icon */}
          <svg
            className="h-6 w-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 16v-2m8-6h2M4 12H2m15.364 5.364l1.414 1.414m-12.728-12.728L4.636 4.636m12.728 0l-1.414 1.414m-12.728 12.728l1.414-1.414"
            />
          </svg>
        </button>
        {menuOpen && (
          <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1">
              {user ? (
                <>
                  <div className="px-4 py-2 text-gray-900 text-sm">Account</div>
                  <Link
                    to="/settings"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <div className="px-4 py-2 text-gray-900 text-sm">Account (Guest)</div>
                  <Link
                    to="/login"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm"
                    onClick={() => setMenuOpen(false)}
                  >
                    Login with Email
                  </Link>
                  <Link
                    to="/signup"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign up with Email
                  </Link>
                  <button
                    onClick={() => { loginWithGoogle(); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {googleBtnLabel}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}