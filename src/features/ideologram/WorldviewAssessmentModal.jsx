import React from 'react';

export default function WorldviewAssessmentModal({
  isOpen,
  onClose,
  assessmentHistory,
  computeWeightedAverage,
  worldviewQuiz,
  worldviewResponses,
  setWorldviewResponses,
  ideoBooks,
  userCredentials,
  selfAssessment,
  ideoChatHistory,
  computeWorldviewScore,
  setConfidenceScores,
  saveAssessment,
  currentAssessment
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">🌍 Comprehensive Worldview Assessment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>

        <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
          <div className="mb-6">
            <p className="text-gray-300 mb-4">
              This assessment evaluates your worldview across multiple dimensions including economic literacy,
              philosophical sophistication, scientific understanding, psychological insight, and historical perspective.
            </p>

            <div className="mb-6 p-4 bg-gray-800 rounded">
              <h4 className="text-md font-semibold text-yellow-400 mb-3">📊 Current Assessment Results</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(computeWorldviewScore(ideoBooks, worldviewResponses, userCredentials, selfAssessment)).map(([dimension, data]) => (
                  <div key={dimension} className="p-3 bg-gray-700 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold capitalize">{dimension.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-gray-400">Confidence: {Math.round(data.overallConfidence * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                      <div className={`h-2 rounded-full ${data.score >= 0 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${Math.abs(data.score) * 100 / 2}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-300">Score: {Math.round(data.score * 100)}% • Sources: {data.sources.length}</div>
                  </div>
                ))}
              </div>

              {currentAssessment && (
                <div className="mt-4 p-3 bg-gray-700 rounded">
                  <h5 className="text-sm font-semibold text-blue-400 mb-2">Assessment Quality Metrics</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400">Vector Resolution:</span>
                      <div className="font-mono">{currentAssessment.metadata.vectorResolution} dimensions</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Total Data Points:</span>
                      <div className="font-mono">{currentAssessment.metadata.totalDataPoints}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Avg Confidence:</span>
                      <div className="font-mono">{Math.round(currentAssessment.metadata.averageConfidence * 100)}%</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Reliability:</span>
                      <div className="font-mono">{Math.round(currentAssessment.metadata.reliabilityScore * 100)}%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {assessmentHistory.length > 0 && (
              <div className="mb-6 p-4 bg-gray-800 rounded">
                <h4 className="text-md font-semibold text-green-400 mb-3">📈 Assessment History & Weighted Averages</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(computeWeightedAverage(assessmentHistory) || {}).map(([dimension, data]) => (
                    <div key={dimension} className="p-3 bg-gray-700 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold capitalize">{dimension.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-gray-400">Weighted Avg</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                        <div className={`h-2 rounded-full ${data.score >= 0 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${Math.abs(data.score) * 100 / 2}%` }}></div>
                      </div>
                      <div className="text-xs text-gray-300">Score: {Math.round(data.score * 100)}% • {data.assessmentCount} assessments</div>
                      <div className="text-xs text-gray-500">Last: {new Date(data.lastAssessment).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {worldviewQuiz.map((question) => (
              <div key={question.id} className="p-4 bg-gray-800 rounded">
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-blue-400 capitalize">{question.category.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-400">Weight: {question.weight}</span>
                  </div>
                  <h4 className="text-sm font-medium">{question.question}</h4>
                </div>

                {question.type === 'scale' ? (
                  <div className="space-y-2">
                    {question.options.map((option, index) => (
                      <label key={index} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={question.id}
                          value={index}
                          checked={worldviewResponses[question.id] === index}
                          onChange={(e) => setWorldviewResponses(prev => ({ ...prev, [question.id]: parseInt(e.target.value) }))}
                          className="text-blue-500"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                ) : question.type === 'text' ? (
                  <input
                    type="text"
                    placeholder={question.placeholder}
                    value={worldviewResponses[question.id] || ''}
                    onChange={(e) => setWorldviewResponses(prev => ({ ...prev, [question.id]: e.target.value }))}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm"
                  />
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={async () => {
                const scores = computeWorldviewScore(ideoBooks, worldviewResponses, userCredentials, selfAssessment, ideoChatHistory);
                setConfidenceScores(scores);
                const assessment = await saveAssessment(scores, worldviewResponses, ideoBooks, ideoChatHistory);
                console.log('Worldview Assessment Results:', assessment);
                const modalContent = document.querySelector('.overflow-auto');
                if (modalContent) modalContent.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
            >
              🧮 Compute Assessment
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded font-medium">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}



