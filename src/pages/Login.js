// src/pages/Login.js
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login, setUser } = useContext(AuthContext);
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
    login(email, password)
      .then(() => navigate('/'))
      .catch(err => setError(err.response?.data?.error || 'Login failed'));
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl mb-4">Login</h1>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="flex space-x-2 mb-4">
        <button
          type="button"
          onClick={() => handleOAuthLogin('google')}
          className="bg-red-500 text-white px-4 py-2"
        >Login with Google</button>
        <button
          type="button"
          onClick={() => handleOAuthLogin('github')}
          className="bg-gray-800 text-white px-4 py-2"
        >Login with GitHub</button>
      </div>
      <div className="border-t mb-4" />
      <form onSubmit={handleSubmit} className="space-y-4">
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
        <button type="submit" className="bg-blue-500 text-white px-4 py-2">Login</button>
      </form>
      <p className="mt-4">
        Don't have an account? <Link to="/signup" className="text-blue-500">Sign up</Link>
      </p>
    </div>
  );
}