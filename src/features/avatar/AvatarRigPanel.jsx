import React, { useEffect, useMemo, useState } from 'react';
import eventBus from '../../shared/events/eventBus';
import { Events } from '../../shared/events/contracts';
import FacePreview from './FacePreview';
import AvatarHead from './AvatarHead';
import Face2D from '../avatar2d/Face2D';
import CalibrationOverlay from '../avatar2d/CalibrationOverlay';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const clampSym = (v) => Math.max(-1, Math.min(1, v));

export default function AvatarRigPanel({ onClose }) {
  // Live visemes (Tier 1 envelope)
  const [vis, setVis] = useState({ JawOpen: 0, MouthWide: 0.5, MouthPucker: 0 });
  // Face driver (manual + blended live)
  const [faceDriver, setFaceDriver] = useState({
    smile: 0,
    surprise: 0,
    anger: 0,
    sadness: 0,
    fear: 0,
    disgust: 0,
    eyeOpenness: 0.5,
    eyebrowHeight: 0.5,
    mouthOpenness: 0.5,
    jawPosition: 0.5,
    cheekPuff: 0,
    lipPucker: 0
  });
  const [liveSync, setLiveSync] = useState(true);
  const [liveBlend, setLiveBlend] = useState(1.0);
  const [mode, setMode] = useState('2d');
  const [headLoaded, setHeadLoaded] = useState(null);
  const [showCalib, setShowCalib] = useState(false);

  useEffect(() => {
    const off = eventBus.on(Events.VoiceAvatarViseme, (p) => {
      if (p && p.shapes) setVis(p.shapes);
    });
    return () => off();
  }, []);

  // Blend live visemes into faceDriver
  useEffect(() => {
    if (!liveSync) return;
    const { JawOpen = 0, MouthWide = 0.5, MouthPucker = 0 } = vis || {};
    setFaceDriver(prev => {
      const live = {
        mouthOpenness: clamp01(JawOpen),
        jawPosition: clamp01(0.4 + JawOpen * 0.4),
        lipPucker: clamp01(MouthPucker),
        smile: clampSym((MouthWide - 0.5) * 2)
      };
      const w = clamp01(liveBlend);
      return {
        ...prev,
        mouthOpenness: prev.mouthOpenness * (1 - w) + live.mouthOpenness * w,
        jawPosition: prev.jawPosition * (1 - w) + live.jawPosition * w,
        lipPucker: prev.lipPucker * (1 - w) + live.lipPucker * w,
        smile: prev.smile * (1 - w) + live.smile * w
      };
    });
  }, [vis, liveSync, liveBlend]);

  const Bar = ({ label, value, color }) => (
    <div className="mb-2">
      <div className="text-xs text-gray-400 mb-1">{label} {Math.round((value || 0) * 100)}%</div>
      <div className="h-2 bg-gray-800 rounded overflow-hidden">
        <div className="h-2" style={{ width: `${Math.round((value || 0) * 100)}%`, background: color, transition: 'width 80ms linear' }} />
      </div>
    </div>
  );

  const FaceControls = useMemo(() => (
    <div className="grid grid-cols-2 gap-3">
      {[{ key: 'smile', min: -1, max: 1 },
        { key: 'surprise', min: 0, max: 1 },
        { key: 'anger', min: 0, max: 1 },
        { key: 'sadness', min: 0, max: 1 },
        { key: 'fear', min: 0, max: 1 },
        { key: 'disgust', min: 0, max: 1 },
        { key: 'eyeOpenness', min: 0, max: 1 },
        { key: 'eyebrowHeight', min: 0, max: 1 },
        { key: 'mouthOpenness', min: 0, max: 1 },
        { key: 'jawPosition', min: 0, max: 1 },
        { key: 'cheekPuff', min: 0, max: 1 },
        { key: 'lipPucker', min: 0, max: 1 }].map(({ key, min, max }) => (
        <div key={key} className="space-y-1">
          <label className="text-xs text-gray-400">{key}:</label>
          <input
            type="range"
            min={min}
            max={max}
            step={0.1}
            value={faceDriver[key]}
            onChange={(e) => setFaceDriver(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-gray-300 block text-center">{faceDriver[key].toFixed(1)}</span>
        </div>
      ))}
    </div>
  ), [faceDriver]);

  return (
    <div className="w-full h-full p-4 overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold text-neon-blue">Avatar Rigging</h2>
        {onClose && <button onClick={onClose} className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600">Close</button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live preview */}
        <div className="p-4 rounded border border-gray-700 bg-gray-900/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-200">Live Preview</div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={liveSync} onChange={e => setLiveSync(e.target.checked)} /> Live Sync
              </label>
              <label className="flex items-center gap-2">
                Blend <input type="range" min={0} max={1} step={0.05} value={liveBlend} onChange={(e)=>setLiveBlend(parseFloat(e.target.value))} />
              </label>
              <div className="flex items-center gap-2">
                <button className={`px-2 py-1 rounded ${mode==='2d'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>setMode('2d')}>2D</button>
                <button className={`px-2 py-1 rounded ${mode==='3d'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>setMode('3d')}>3D</button>
              </div>
              {mode === '2d' && (
                <button className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600" onClick={()=>setShowCalib(true)}>Calibrate</button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center min-h-[280px]">
            {mode === '3d' ? (
              <div style={{ position: 'relative', width: 260, height: 260 }}>
                <div style={{ position: 'absolute', inset: 0, display: headLoaded ? 'none':'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Face2D width={240} height={240} liveBlend={liveBlend} />
                </div>
                <div style={{ position: 'absolute', inset: 0, opacity: headLoaded ? 1:0 }}>
                  <AvatarHead faceDriver={faceDriver} liveBlend={liveBlend} onLoad={setHeadLoaded} />
                </div>
              </div>
            ) : (
              <div>
                <Face2D width={280} height={280} liveBlend={liveBlend} />
              </div>
            )}
          </div>
          {showCalib && (
            <div className="mt-3 border border-gray-700 rounded bg-gray-900/70">
              <CalibrationOverlay width={320} height={320} onClose={()=>setShowCalib(false)} />
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <Bar label="JawOpen" value={vis.JawOpen} color="#22c55e" />
            <Bar label="MouthWide" value={vis.MouthWide} color="#0ea5e9" />
            <Bar label="MouthPucker" value={vis.MouthPucker} color="#f59e0b" />
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 rounded border border-gray-700 bg-gray-900/50">
          <div className="text-sm font-semibold text-gray-200 mb-2">Face Controls</div>
          {FaceControls}
          <div className="mt-4 text-xs text-gray-500">Tip: Live Sync blends with these sliders. Reduce Blend to make manual controls dominant.</div>
        </div>
      </div>
    </div>
  );
}

