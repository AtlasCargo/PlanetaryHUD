import React from 'react';
import { motion } from 'framer-motion';

export default function RightSidebarContent({ glowEnabled }) {
  const quests = [
    { label: 'I. Quantum Gravity Theory', color: 'neon-purple', progress: 40 },
    { label: 'II. Genomic Decryption', color: 'neon-orange', progress: 65 },
    { label: 'III. Fusion Ignition', color: 'neon-red', progress: 80 },
    { label: 'IV. Neural Singularity', color: 'neon-green', progress: 25 },
  ];
  return (
    <>
      <div className="p-6 space-y-6">
        {quests.map((quest, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.2 }}
            className={`group relative p-4 rounded-lg border transition-all ${
              glowEnabled ? 'border-neon-purple/20 hover:border-neon-purple/50' : 'border-gray-600 hover:border-gray-400'
            }`}
          >
            <p className={`text-lg ${glowEnabled ? 'text-neon-blue' : 'text-blue-900'}`}>
              <span className={`${glowEnabled ? 'glow-text' : ''}`}>{quest.label}</span>
            </p>
            <div className="h-1 bg-gray-700 rounded-full">
              <div className={`h-full transition-all duration-1000 ${glowEnabled ? `bg-gradient-to-r from-${quest.color}` : 'bg-gray-500'}`} style={{ width: `${quest.progress}%` }} />
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h4 className="text-xl font-bold text-gray-400">TECHNOLOGY</h4>
        <div>
          <p className={`${glowEnabled ? 'text-neon-purple' : 'text-gray-400'} text-lg mb-2`}>Kardashev Type: 0.4</p>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className={`${glowEnabled ? 'bg-gradient-to-r from-neon-purple to-purple-800' : 'bg-gray-500'} h-full rounded-full`} style={{ width: '40%' }} />
          </div>
        </div>
        <div>
          <p className={`${glowEnabled ? 'text-neon-red' : 'text-gray-400'} text-lg mb-2`}>Energy: 49GW/day</p>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className={`${glowEnabled ? 'bg-gradient-to-r from-neon-red to-red-800' : 'bg-gray-500'} h-full rounded-full`} style={{ width: '65%' }} />
          </div>
        </div>
      </motion.div>
    </>
  );
}


