import React from 'react';

export default function WorldviewPanel({
  user,
  assessmentHistory,
  computeWeightedAverage,
  setWorldviewQuizOpen,
}) {
  return (
    <div className="p-4 rounded-lg border border-neon-blue/50 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {user?.email?.charAt(0)?.toUpperCase?.() || 'U'}
          </div>
          <div>
            <div className="text-lg font-medium text-white">{user?.email || 'User'}</div>
            <div className="text-sm text-gray-400">Worldview Assessment</div>
          </div>
        </div>
        {assessmentHistory?.length > 0 && (
          <div className="text-right">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-sm px-3 py-2 rounded-full border border-white shadow-sm">
              {(() => {
                const weightedScores = computeWeightedAverage(assessmentHistory);
                if (weightedScores && Object.keys(weightedScores).length > 0) {
                  const avgScore = Object.values(weightedScores).reduce((sum, data) => sum + data.score, 0) / Object.keys(weightedScores).length;
                  return `${Math.round(avgScore * 100)}%`;
                }
                return 'N/A';
              })()}
            </div>
            <div className="text-xs text-gray-400 mt-1">Overall Score</div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-neon-blue">🌍 Worldview Assessment</h2>
        <button onClick={() => setWorldviewQuizOpen(true)} className="px-3 py-1 bg-neon-blue text-black rounded text-sm hover:bg-blue-400 transition-colors">
          {assessmentHistory?.length > 0 ? 'Take Assessment' : 'Start Assessment'}
        </button>
      </div>

      {assessmentHistory?.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(() => {
              const weightedScores = computeWeightedAverage(assessmentHistory);
              if (weightedScores && Object.keys(weightedScores).length > 0) {
                return Object.entries(weightedScores).map(([dimension, data]) => (
                  <div key={dimension} className="p-3 bg-gray-800/60 rounded border border-gray-600">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold capitalize text-gray-200">{dimension.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-gray-400">{Math.round(data.score * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                      <div className={`h-2 rounded-full ${data.score >= 0 ? 'bg-gradient-to-r from-green-500 to-blue-500' : 'bg-gradient-to-r from-orange-500 to-red-500'}`} style={{ width: `${Math.abs(data.score) * 100}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-400">{data.assessmentCount} assessments • Last: {new Date(data.lastAssessment).toLocaleDateString()}</div>
                  </div>
                ));
              }
              return null;
            })()}
          </div>
          {(() => {
            const weightedScores = computeWeightedAverage(assessmentHistory);
            if (weightedScores && Object.keys(weightedScores).length > 0) {
              const avgScore = Object.values(weightedScores).reduce((sum, data) => sum + data.score, 0) / Object.keys(weightedScores).length;
              const totalAssessments = Object.values(weightedScores).reduce((sum, data) => sum + data.assessmentCount, 0);
              return (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">Overall Score:</span>
                    <span className="text-neon-blue font-semibold">{Math.round(avgScore * 100)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>Total Assessments: {totalAssessments}</span>
                    <span>Dimensions: {Object.keys(weightedScores).length}</span>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </>
      ) : (
        <div className="text-center text-gray-400 py-6">
          <div className="text-4xl mb-2">🧠</div>
          <p className="text-sm mb-3">Take your first worldview assessment to discover your intellectual profile</p>
          <p className="text-xs text-gray-500">Assess your knowledge across multiple dimensions including economics, philosophy, science, psychology, and history</p>
        </div>
      )}
    </div>
  );
}


