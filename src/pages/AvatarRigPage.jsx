import React from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarRigPanel from '../features/avatar/AvatarRigPanel';

export default function AvatarRigPage() {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm overflow-auto">
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-200">Avatar Rig</h2>
          <button
            onClick={() => navigate(-1)}
            className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
          >Close</button>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <AvatarRigPanel />
        </div>
      </div>
    </div>
  );
}

