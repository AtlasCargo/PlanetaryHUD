// src/pages/Signup.js
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { signup, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleOAuthLogin = provider => {
    setError(null);
    const width = 500, height = 600;
    const left = (window.innerWidth - width) / 2 + window.screenX;
    const top = (window.innerHeight - height) / 2 + window.screenY;
    const popup = window.open(
      `/api/auth/${provider}`,
      `Login with ${provider}`,
      `width=${width},height=${height},left=${left},top=${top}`
    );
    if (!popup) {
      setError('Popup blocked');
      return;
    }
    const listener = event => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (data.token) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        popup.close();
        window.removeEventListener('message', listener);
        navigate('/');
      } else if (data.error) {
        setError(data.error);
        popup.close();
        window.removeEventListener('message', listener);
      }
    };
    window.addEventListener('message', listener);
  };
  const handleSubmit = e => {
    e.preventDefault();
    setError(null);
    signup(email, password)
      .then(() => navigate('/'))
      .catch(err => setError(err.response?.data?.error || 'Signup failed'));
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl mb-4">Sign Up</h1>
      <div className="flex space-x-2 mb-4">
        <button
          type="button"
          onClick={() => handleOAuthLogin('google')}
          className="bg-red-500 text-white px-4 py-2"
        >Sign Up with Google</button>
        <button
          type="button"
          onClick={() => handleOAuthLogin('github')}
          className="bg-gray-800 text-white px-4 py-2"
        >Sign Up with GitHub</button>
      </div>
      <div className="border-t mb-4" />
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border px-2 py-1"
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full border px-2 py-1"
          />
        </div>
        <button type="submit" className="bg-green-500 text-white px-4 py-2">Sign Up</button>
      </form>
      <p className="mt-4">
        Already have an account? <Link to="/login" className="text-blue-500">Log in</Link>
      </p>
    </div>
  );
}