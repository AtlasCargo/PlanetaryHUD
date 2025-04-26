// src/components/Navbar.js
import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout, loginWithGoogle } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Label for Google button based on existing auth token
  const googleBtnLabel = localStorage.getItem('token')
    ? 'Continue with Google'
    : 'Sign up with Google';
  
  return (
    <nav className="bg-gray-800 p-4 text-white flex justify-between items-center">
      <Link to="/" className="font-bold">MyApp</Link>
      <div className="relative">
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