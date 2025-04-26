// src/pages/Settings.js
import React, { useState, useEffect, useContext } from 'react';
import API from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';

// Example default avatar URLs (using DiceBear)
const defaultAvatars = [
  'https://api.dicebear.com/5.x/pixel-art/svg?seed=female1',
  'https://api.dicebear.com/5.x/pixel-art/svg?seed=female2',
  'https://api.dicebear.com/5.x/pixel-art/svg?seed=female3',
  'https://api.dicebear.com/5.x/pixel-art/svg?seed=female4',
  'https://api.dicebear.com/5.x/pixel-art/svg?seed=male1',
  'https://api.dicebear.com/5.x/pixel-art/svg?seed=male2',
  'https://api.dicebear.com/5.x/pixel-art/svg?seed=male3',
  'https://api.dicebear.com/5.x/pixel-art/svg?seed=male4',
  'https://api.dicebear.com/5.x/pixel-art/svg?seed=robot1',
  'https://api.dicebear.com/5.x/pixel-art/svg?seed=robot2',
  'https://api.dicebear.com/5.x/pixel-art/svg?seed=robot3',
  'https://api.dicebear.com/5.x/pixel-art/svg?seed=animal1',
];

export default function Settings() {
  const { user, setUser, logout } = useContext(AuthContext);
  const [apiKey, setApiKey] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl || '');
  }, [user]);

  function chooseAvatar(url) {
    setError(null);
    API.put('/api/user', { avatarUrl: url })
      .then(res => setUser(prev => ({ ...prev, avatarUrl: res.data.avatarUrl })))
      .catch(err => setError(err.response?.data?.error || 'Failed to update avatar'));
  }

  function saveApiKey(e) {
    e.preventDefault();
    setError(null);
    API.put('/api/user', { apiKey })
      .then(() => setApiKey(''))
      .catch(err => setError(err.response?.data?.error || 'Failed to save API key'));  
  }

  function generateAvatar() {
    setError(null);
    setLoading(true);
    API.post('/api/avatar', { prompt: 'Professional user avatar', model: 'gpt-image-1' })
      .then(res => setUser(prev => ({ ...prev, avatarUrl: res.data.url })))
      .catch(err => setError(err.response?.data?.error || 'Failed to generate avatar'))
      .finally(() => setLoading(false));
  }

  if (!user) return <p>Loading...</p>;
  return (
    <div className="max-w-xl mx-auto mt-10">
      <h1 className="text-2xl mb-4">Settings</h1>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div>
        <h2 className="text-xl mb-2">Current Avatar</h2>
        {avatarUrl && <img src={avatarUrl} alt="avatar" className="w-24 h-24 mb-2" />}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {defaultAvatars.map(url => (
            <img
              key={url}
              src={url}
              alt="default"
              className="w-16 h-16 cursor-pointer border"
              onClick={() => chooseAvatar(url)}
            />
          ))}
        </div>
        <button
          onClick={generateAvatar}
          disabled={loading}
          className="bg-purple-500 text-white px-4 py-2 mb-4"
        >
          {loading ? 'Generating...' : 'Generate New Avatar'}
        </button>
      </div>
      <form onSubmit={saveApiKey} className="space-y-4">
        <h2 className="text-xl mb-2">OpenAI API Key</h2>
        <div>
          <input
            type="password"
            placeholder="Enter your OpenAI API key"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="w-full border px-2 py-1"
          />
        </div>
        <button type="submit" className="bg-yellow-500 text-black px-4 py-2">Save API Key</button>
      </form>
      <button onClick={logout} className="mt-6 text-red-500">Logout</button>
    </div>
  );
}