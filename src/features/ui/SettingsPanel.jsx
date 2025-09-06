import React from 'react';
import ThemeSwitcher from '../../components/UI/ThemeSwitcher';

export default function SettingsPanel({
  user,
  userAvatarUrl,
  mode,
  assessmentHistory = [],
  isLiquidGlassActive,
  glowEnabled,
  setGlowEnabled,
  lowPowerMode,
  updateFPS,
  setUpdateFPS,
  showScanner,
  setShowScanner,
  cursorMode,
  setCursorMode,
  showParticles,
  setShowParticles,
  particlesOpacity,
  setParticlesOpacity,
  rotationEnabled,
  setRotationEnabled,
  enableCpuMonitor,
  setEnableCpuMonitor,
  cpuUsage = 0,
  showGlobe,
  setShowGlobe,
  showGlobeTexture,
  setShowGlobeTexture,
  globeTextureType,
  setGlobeTextureType,
  globeOpacity,
  setGlobeOpacity,
  materialType,
  setMaterialType,
  showGraticules,
  setShowGraticules,
  showAtmosphere,
  setShowAtmosphere,
  logout,
  loginWithGoogle,
  navigate
}) {
  const computeWeightedAverage = (history) => {
    try {
      const grouped = {};
      for (const item of history) {
        for (const [dim, data] of Object.entries(item.dimensions || {})) {
          grouped[dim] = grouped[dim] || { score: 0, count: 0, lastAssessment: 0 };
          grouped[dim].score += data.score || 0;
          grouped[dim].count += 1;
          grouped[dim].lastAssessment = Math.max(grouped[dim].lastAssessment, new Date(item.createdAt || 0).getTime());
        }
      }
      const out = {};
      for (const [dim, g] of Object.entries(grouped)) {
        out[dim] = {
          score: g.count ? g.score / g.count : 0,
          assessmentCount: g.count,
          lastAssessment: g.lastAssessment ? new Date(g.lastAssessment).toISOString() : null
        };
      }
      return out;
    } catch { return {}; }
  };

  return (
    <div
      className={`fixed top-[3.5rem] right-4 w-64 max-w-[90vw] ${
        glowEnabled ? 'border border-neon-blue/50' : 'border border-gray-600'
      } bg-gray-900/95 rounded-lg shadow-2xl backdrop-blur-xl p-4 z-[99999] ${
        isLiquidGlassActive ? 'liquid-glass-panel' : ''
      }`}
      style={{ maxHeight: '80vh', overflowY: 'auto' }}
    >
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          {user && userAvatarUrl && (
            <div className="relative">
              <img src={userAvatarUrl} alt="User Avatar" className="w-10 h-10 rounded-full border-2 border-neon-blue/50" />
              {mode === 'ideologram' && assessmentHistory.length > 0 && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full border-2 border-white shadow-lg">
                  {(() => {
                    const weighted = computeWeightedAverage(assessmentHistory);
                    if (weighted && Object.keys(weighted).length > 0) {
                      const avg = Object.values(weighted).reduce((s, d) => s + d.score, 0) / Object.keys(weighted).length;
                      return `${Math.round(avg * 100)}%`;
                    }
                    return 'N/A';
                  })()}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm text-white">{user ? `Signed in as ${user.email}` : 'Not signed in'}</span>
            {mode === 'ideologram' && assessmentHistory.length > 0 && (
              <div className="text-xs text-gray-300 mt-1">
                {(() => {
                  const weighted = computeWeightedAverage(assessmentHistory);
                  if (weighted && Object.keys(weighted).length > 0) {
                    const dimensions = Object.keys(weighted).length;
                    const last = Math.max(...Object.values(weighted).map(d => new Date(d.lastAssessment).getTime()));
                    return `${dimensions} dimensions • Last: ${new Date(last).toLocaleDateString()}`;
                  }
                  return 'No assessments yet';
                })()}
              </div>
            )}
          </div>
        </div>
        {user ? (
          <button onClick={logout} className="px-2 py-1 bg-red-600 text-white rounded">Logout</button>
        ) : (
          <div className="flex flex-col space-y-2">
            <button onClick={loginWithGoogle} className={`px-2 py-1 bg-neon-blue text-black rounded ${isLiquidGlassActive ? 'liquid-glass-button' : ''}`}>Continue with Google</button>
            <button onClick={() => navigate('/login')} className={`px-2 py-1 bg-neon-purple text-black rounded ${isLiquidGlassActive ? 'liquid-glass-button' : ''}`}>Login with Email</button>
          </div>
        )}
      </div>

      <div className={`space-y-4 ${isLiquidGlassActive ? 'liquid-glass-panel' : ''}`}>
        <div>
          <span className={`text-sm ${isLiquidGlassActive ? 'text-white' : 'text-neon-blue'} block mb-2`}>Themes</span>
          <ThemeSwitcher />
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-sm ${isLiquidGlassActive ? 'text-white' : 'text-neon-blue'}`}>Glow Effects</span>
          <label className={`switch ${isLiquidGlassActive ? 'liquid-glass-effect' : ''}`}>
            <input type="checkbox" checked={glowEnabled} onChange={(e) => setGlowEnabled(e.target.checked)} disabled={lowPowerMode} />
            <span className="slider round"></span>
          </label>
        </div>

        <div className="space-y-2">
          <span className="text-sm text-neon-blue block">Update Rate</span>
          <div className="flex gap-2">
            <button onClick={() => setUpdateFPS(1)} className={`flex-1 p-2 rounded-lg ${updateFPS === 1 ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'}`}>1 FPS</button>
            <button onClick={() => setUpdateFPS(24)} className={`flex-1 p-2 rounded-lg ${updateFPS === 24 ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'}`}>24 FPS</button>
            <button onClick={() => setUpdateFPS(60)} className={`flex-1 p-2 rounded-lg ${updateFPS === 60 ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'}`}>60 FPS</button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-sm ${isLiquidGlassActive ? 'text-white' : 'text-neon-blue'}`}>Scanner Effect</span>
          <label className={`switch ${isLiquidGlassActive ? 'liquid-glass-effect' : ''}`}>
            <input type="checkbox" checked={showScanner} onChange={(e) => setShowScanner(e.target.checked)} />
            <span className="slider round"></span>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-sm ${isLiquidGlassActive ? 'text-white' : 'text-neon-blue'}`}>Cursor Mode</span>
          <label className={`switch ${isLiquidGlassActive ? 'liquid-glass-effect' : ''}`}>
            <input type="checkbox" checked={cursorMode} onChange={(e) => setCursorMode(e.target.checked)} />
            <span className="slider round"></span>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-sm ${isLiquidGlassActive ? 'text-white' : 'text-neon-blue'}`}>Particles</span>
          <label className={`switch ${isLiquidGlassActive ? 'liquid-glass-effect' : ''}`}>
            <input type="checkbox" checked={showParticles} onChange={(e) => setShowParticles(e.target.checked)} />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="space-y-2">
          <span className="text-sm text-neon-blue block">Particles Density</span>
          <input type="range" min="0" max="1" step="0.1" value={particlesOpacity} onChange={(e) => setParticlesOpacity(parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
          <span className="text-xs text-neon-purple">{Math.round(particlesOpacity * 100)}%</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-neon-blue">Auto Rotation</span>
          <label className="switch">
            <input type="checkbox" checked={rotationEnabled} onChange={(e) => setRotationEnabled(e.target.checked)} />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neon-blue">CPU Monitor</span>
          <label className="switch">
            <input type="checkbox" checked={enableCpuMonitor} onChange={(e) => setEnableCpuMonitor(e.target.checked)} />
            <span className="slider round"></span>
          </label>
        </div>
        {enableCpuMonitor && (<div className="text-xs text-neon-purple">System Load: {cpuUsage.toFixed(1)}%</div>)}

        <div className="flex items-center justify-between">
          <span className="text-sm text-neon-blue">Globe Visibility</span>
          <label className="switch">
            <input type="checkbox" checked={showGlobe} onChange={(e) => setShowGlobe(e.target.checked)} />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neon-blue">Power Save Mode</span>
          <label className="switch">
            <input type="checkbox" checked={lowPowerMode} onChange={(e) => setLowPowerMode(e.target.checked)} />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neon-blue">Globe Texture</span>
          <label className="switch">
            <input type="checkbox" checked={showGlobeTexture} onChange={(e) => setShowGlobeTexture(e.target.checked)} disabled={lowPowerMode} />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neon-blue">Night Texture</span>
          <label className={`switch ${isLiquidGlassActive ? 'liquid-glass-effect' : ''}`}>
            <input type="checkbox" checked={globeTextureType === 'night'} onChange={(e) => setGlobeTextureType(e.target.checked ? 'night' : 'day')} />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neon-blue">Globe Opacity</span>
          <label className="switch">
            <input type="checkbox" checked={globeOpacity > 0.5} onChange={(e) => setGlobeOpacity(e.target.checked ? 1 : 0.5)} disabled={lowPowerMode} />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="space-y-2">
          <span className="text-sm text-neon-blue block">Globe Material</span>
          <div className="flex gap-2">
            <button onClick={() => setMaterialType('phong')} className={`flex-1 p-2 rounded-lg ${materialType === 'phong' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'}`}>Phong</button>
            <button onClick={() => setMaterialType('lambert')} className={`flex-1 p-2 rounded-lg ${materialType === 'lambert' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-gray-800/40 text-gray-300'}`}>Lambert</button>
            <button onClick={() => setMaterialType('basic')} className={`flex-1 p-2 rounded-lg ${materialType === 'basic' ? 'bg-neon-red/20 text-neon-red' : 'bg-gray-800/40 text-gray-300'}`}>Basic</button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neon-blue">Lat/Lon Grid</span>
          <label className="switch">
            <input type="checkbox" checked={showGraticules} onChange={(e) => setShowGraticules(e.target.checked)} />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neon-blue">Atmosphere Glow</span>
          <label className="switch">
            <input type="checkbox" checked={showAtmosphere} onChange={(e) => setShowAtmosphere(e.target.checked)} disabled={lowPowerMode} />
            <span className="slider round"></span>
          </label>
        </div>
      </div>
    </div>
  );
}


