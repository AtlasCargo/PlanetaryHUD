import React from 'react';

export default function ChatIntegrationInfo() {
  return (
    <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/40">
      <h2 className="text-lg font-semibold mb-2">💬 Chat Integration</h2>
      <p className="text-sm text-gray-400 mb-2">
        Use the Mini Chat (bottom of left sidebar) to discuss worldview topics and enhance your assessment
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <h3 className="font-medium text-blue-400">Suggested Chat Topics:</h3>
          <ul className="text-gray-300 space-y-1">
            <li>• Economic systems and policies</li>
            <li>• Philosophical questions and ethics</li>
            <li>• Scientific concepts and methods</li>
            <li>• Psychological insights and behavior</li>
            <li>• Historical events and perspectives</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="font-medium text-green-400">Chat Analysis Benefits:</h3>
          <ul className="text-gray-300 space-y-1">
            <li>• Enhanced assessment accuracy</li>
            <li>• Real-time worldview insights</li>
            <li>• Continuous learning tracking</li>
            <li>• Personalized recommendations</li>
          </ul>
        </div>
      </div>
      <div className="mt-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-200">
        💡 <strong>Tip:</strong> The more you chat about worldview topics, the more accurate your assessment becomes. 
        Chat conversations are automatically analyzed and integrated into your worldview profile.
      </div>
    </div>
  );
}


