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
  const [assistantAvatarUrl, setAssistantAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [assistantUploading, setAssistantUploading] = useState(false);
  const [assistantPreviewUrl, setAssistantPreviewUrl] = useState('');

  useEffect(() => {
    // Initialize user avatar local state from storage or context
    const stored = localStorage.getItem('avatarUrl');
    setAvatarUrl(stored ?? user?.avatarUrl ?? '');
    // Initialize assistant avatar from storage or random default
    const storedA = localStorage.getItem('assistantAvatarUrl');
    if (storedA) {
      setAssistantAvatarUrl(storedA);
    } else {
      const rand = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
      setAssistantAvatarUrl(rand);
      localStorage.setItem('assistantAvatarUrl', rand);
    }
  }, [user]);

  function chooseAvatar(url) {
    setError(null);
    const token = localStorage.getItem('token');
    // If no valid token (e.g. dummy), fallback to local only
    if (!token || token === 'DUMMY_TOKEN') {
      setUser(prev => prev ? { ...prev, avatarUrl: url } : prev);
      localStorage.setItem('avatarUrl', url);
      return;
    }
    API.put('/api/user', { avatarUrl: url })
      .then(res => {
        setUser(prev => ({ ...prev, avatarUrl: res.data.avatarUrl }));
        localStorage.setItem('avatarUrl', res.data.avatarUrl);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to update avatar');
      });
  }

  function saveApiKey(e) {
    e.preventDefault();
    setError(null);
    API.put('/api/user', { apiKey })
      .then(() => setApiKey(''))
      .catch(err => setError(err.response?.data?.error || 'Failed to save API key'));  
  }

  function handleFileChange(e) {
    const file = e.target.files[0]; if (!file) return;
    setError(null);
    setUploading(true);
    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl(blobUrl);
    const form = new FormData(); form.append('avatar', file);
    const token = localStorage.getItem('token');
    if (!token || token === 'DUMMY_TOKEN') {
      // local-only upload
      setUser(prev => prev ? { ...prev, avatarUrl: blobUrl } : prev);
      localStorage.setItem('avatarUrl', blobUrl);
      setUploading(false);
      return;
    }
    API.post('/api/user/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(res => {
        setUser(prev => ({ ...prev, avatarUrl: res.data.avatarUrl }));
        localStorage.setItem('avatarUrl', res.data.avatarUrl);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Upload failed');
      })
      .finally(() => setUploading(false));
  }

  function handleAssistantFileChange(e) {
    const file = e.target.files[0]; if (!file) return;
    setError(null);
    setAssistantUploading(true);
    const blobUrl = URL.createObjectURL(file);
    setAssistantPreviewUrl(blobUrl);
    const form = new FormData(); form.append('avatar', file);
    const token = localStorage.getItem('token');
    // Local fallback for dummy/no-token
    if (!token || token === 'DUMMY_TOKEN') {
      setAssistantAvatarUrl(blobUrl);
      localStorage.setItem('assistantAvatarUrl', blobUrl);
      setAssistantUploading(false);
      return;
    }
    API.post('/api/user/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(res => {
        setAssistantAvatarUrl(res.data.avatarUrl);
        localStorage.setItem('assistantAvatarUrl', res.data.avatarUrl);
      })
      .catch(err => setError(err.response?.data?.error || 'Upload failed'))
      .finally(() => setAssistantUploading(false));
  }

  function generateAvatar() {
    setError(null);
    setLoading(true);
    API.post('/api/avatar', { prompt: 'Professional user avatar', model: 'gpt-image-1' })
      .then(res => setUser(prev => ({ ...prev, avatarUrl: res.data.url })))
      .catch(err => setError(err.response?.data?.error || 'Failed to generate avatar'))
      .finally(() => setLoading(false));
  }

  // Display settings even if user context initialises to null
  // 'user' may be null if not logged in; form will use default values
  // Remove blocking Loading state
  return (
    <div className="max-w-xl mx-auto mt-10">
      <h1 className="text-2xl mb-4">Settings</h1>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div>
        <h2 className="text-xl mb-2">Current Avatar</h2>
        {previewUrl ? (
          <img src={previewUrl} alt="preview" className="w-24 h-24 mb-2" />
        ) : (
          avatarUrl && <img src={avatarUrl} alt="avatar" className="w-24 h-24 mb-2" />
        )}
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
        {/* Upload Avatar for User */}
        <div className="mb-4">
          <h2 className="text-xl mb-2">Upload Avatar</h2>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {uploading && <p className="text-sm">Uploading...</p>}
        </div>
        {/* Assistant Avatar Upload */}
        <div className="mb-4">
          <h2 className="text-xl mb-2">Upload Assistant Avatar</h2>
          <input type="file" accept="image/*" onChange={handleAssistantFileChange} />
          {assistantUploading && <p className="text-sm">Uploading...</p>}
          {assistantPreviewUrl && <img src={assistantPreviewUrl} alt="assistant preview" className="w-24 h-24 mb-2 rounded-full" />}
        </div>
        {/* Assistant Avatar Selection */}
        <div className="mb-4">
          <h2 className="text-xl mb-2">Assistant Avatar</h2>
          {assistantAvatarUrl && <img src={assistantAvatarUrl} alt="assistant avatar" className="w-24 h-24 mb-2 rounded-full" />}
          <div className="grid grid-cols-4 gap-2">
            {defaultAvatars.map(url => (
              <img
                key={url}
                src={url}
                alt="assistant"
                className="w-16 h-16 cursor-pointer border rounded-full"
                onClick={() => {
                  setAssistantAvatarUrl(url);
                  localStorage.setItem('assistantAvatarUrl', url);
                }}
              />
            ))}
          </div>
        </div>
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