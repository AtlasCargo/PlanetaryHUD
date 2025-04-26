import React, { useState, useEffect, useContext } from 'react';
import API from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';

export default function AvatarPage() {
  const { user, setUser } = useContext(AuthContext);
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatars, setAvatars] = useState([]);

  // Set selected avatar as current user avatar
  const setAsAvatar = async (url) => {
    try {
      await API.put('/api/user', { avatarUrl: url });
      setUser(prev => ({ ...prev, avatarUrl: url }));
    } catch (err) {
      console.error('Failed to set avatar:', err);
      setError(err.response?.data?.error || 'Failed to set avatar');
    }
  };

  // Fetch saved avatars on mount
  useEffect(() => {
    API.get('/api/avatars')
      .then(res => setAvatars(res.data.avatars || []))
      .catch(err => console.error('Failed to load avatars:', err));
  }, []);

  const createAvatar = async () => {
    if (!prompt.trim() || !name.trim()) {
      setError('Please provide both prompt and name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/api/avatars', { prompt, name });
      // Add to list
      setAvatars(prev => [res.data, ...prev]);
      setPrompt('');
      setName('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create avatar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 text-white">
      <button
        className="absolute top-2 right-2 text-gray-400 hover:text-white"
        onClick={() => window.history.back()}
      >×</button>
      <h2 className="text-2xl font-bold mb-4">Avatar Generator</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Avatar name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full p-2 bg-gray-800 text-white rounded"
        />
        <textarea
          rows={3}
          placeholder="Enter prompt to describe your avatar..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          className="w-full p-2 bg-gray-800 text-white rounded"
        />
        <button
          onClick={createAvatar}
          disabled={loading}
          className="w-full bg-neon-green text-black p-2 rounded"
        >{loading ? 'Creating...' : 'Create Avatar'}</button>
      </div>
      {avatars.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-bold mb-2">Your Avatars</h3>
          <div className="grid grid-cols-3 gap-2">
            {avatars.map(av => (
              <div key={av.id} className="text-center">
                <img src={av.url} alt={av.name} className="w-full h-auto rounded" />
                <div className="mt-1 text-sm">{av.name}</div>
                <div className="mt-1 flex justify-center space-x-2">
                  <button
                    onClick={() => setAsAvatar(av.url)}
                    className="text-blue-500 text-sm"
                  >
                    Set as Avatar
                  </button>
                  <a
                    href={av.url}
                    download={`${av.name}.png`}
                    className="text-green-500 text-sm"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}