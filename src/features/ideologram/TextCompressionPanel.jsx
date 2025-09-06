import React from 'react';
import API from '../../utils/api';

export default function TextCompressionPanel({
  ideoFreeText,
  setIdeoFreeText,
  epubMeta,
  setEpubMeta,
  setEpubName,
  analyzeTextLexical,
  setIdeoTextResult,
  ideoCompressing,
  setIdeoCompressing,
  ideoCompressionStatus,
  setIdeoCompressionStatus,
  setIdeoCompressionResult,
  setIdeoError,
  setFileTree,
}) {
  return (
    <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/40">
      <h2 className="text-lg font-semibold mb-2">Analyze text or EPUB</h2>

      <input
        type="file"
        accept=".txt,text/plain"
        className="mb-2"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => setIdeoFreeText(String(reader.result || ''));
          reader.readAsText(f);
        }}
      />

      <input
        type="file"
        accept=".epub,application/epub+zip"
        className="mb-2"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const JSZip = (await import('jszip')).default;
            const buf = await f.arrayBuffer();
            const zip = await JSZip.loadAsync(buf);
            setEpubName(f.name);
            const textFiles = Object.keys(zip.files).filter((p) => /(x?html|htm)$/i.test(p));
            let combined = '';
            for (const p of textFiles) {
              const file = zip.file(p);
              if (!file) continue;
              const html = await file.async('string');
              const stripped = html
                .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                .replace(/<[^>]+>/g, ' ');
              combined += ' ' + stripped;
            }
            setIdeoFreeText(combined);
            try {
              let opfPath;
              const containerXml = await zip.file('META-INF/container.xml')?.async('string');
              if (containerXml) {
                const m = containerXml.match(/full-path="([^"]+)"/);
                if (m) opfPath = m[1];
              }
              if (!opfPath) opfPath = Object.keys(zip.files).find((p) => /\.opf$/i.test(p));
              const meta = { title: '', author: '', isbn: '' };
              if (opfPath) {
                const opf = await zip.file(opfPath)?.async('string');
                if (opf) {
                  const titleMatch = opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
                  const creatorMatch = opf.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
                  meta.title = titleMatch ? titleMatch[1].trim() : '';
                  meta.author = creatorMatch ? creatorMatch[1].trim() : '';
                  const ids = Array.from(opf.matchAll(/<dc:identifier[^>]*>([\s\S]*?)<\/dc:identifier>/gi)).map((m) => m[1]);
                  const textBlob = ids.join(' ') + ' ' + opf;
                  const isbnCandidates = Array.from(textBlob.matchAll(/\b(?:97[89][-\s]?)?[0-9][-0-9\s]{8,}[0-9Xx]\b/g)).map((m) => m[0]);
                  const normalized = isbnCandidates.map((s) => s.replace(/[^0-9Xx]/g, ''));
                  const isbn13 = normalized.find((s) => /^97[89][0-9]{10}$/.test(s));
                  const isbn10 = normalized.find((s) => /^[0-9]{9}[0-9Xx]$/.test(s));
                  meta.isbn = isbn13 || isbn10 || '';
                }
              }
              if (!meta.title && f.name) meta.title = f.name.replace(/\.[^.]+$/, '');
              setEpubMeta(meta);
            } catch {}
          } catch {}
        }}
      />

      <textarea
        className="w-full min-h-[120px] p-2 bg-gray-800 text-white rounded"
        placeholder="Paste text here"
        value={ideoFreeText}
        onChange={(e) => setIdeoFreeText(e.target.value)}
      />

      <div className="mt-2 flex gap-2">
        <button
          className="px-3 py-1 bg-neon-blue text-black rounded"
          onClick={() => setIdeoTextResult(analyzeTextLexical(ideoFreeText))}
          disabled={!ideoFreeText.trim()}
        >
          Analyze text
        </button>

        <button
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          onClick={async () => {
            if (!ideoFreeText.trim()) return;
            const bookId = (epubMeta?.isbn && epubMeta.isbn.trim()) || `${(epubMeta?.title || 'Untitled').trim()}|${(epubMeta?.author || '').trim()}`;
            try {
              setIdeoCompressing(true);
              setIdeoError(null);
              setIdeoCompressionStatus((prev) => ({
                ...prev,
                step: 'extracting',
                currentStep: 'Running full compression pipeline...',
                progress: 0,
                debugMode: false,
              }));
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 35 * 60 * 1000);
              const response = await API.post(
                '/api/ideologram/compress',
                {
                  text: ideoFreeText,
                  bookId,
                  title: epubMeta?.title || 'Untitled',
                  author: epubMeta?.author || 'Unknown',
                  docType: 'nonfiction',
                },
                { signal: controller.signal }
              );
              clearTimeout(timeoutId);
              if (response.data.ok) {
                setIdeoCompressionResult(response.data.summary);
                const summary = response.data.summary;
                setIdeoCompressionStatus((prev) => ({
                  ...prev,
                  step: 'complete',
                  sentences: summary.stats?.sentences || 0,
                  statements: summary.stats?.statements || 0,
                  discarded: (summary.stats?.sentences || 0) - (summary.stats?.statements || 0),
                  clusters: summary.stats?.clusters || 0,
                  theses: summary.stats?.theses || 0,
                  coverage: summary.summary?.coverage_fraction || 0,
                  mdlReduction: summary.summary?.mdl_reduction_bits || 0,
                  currentStep: 'Full compression complete',
                  progress: 100,
                  canRunNext: false,
                  nextStep: '',
                }));
                if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                  const res = await API.get('/api/ideologram/fs');
                  setFileTree(res.data || null);
                }
              }
            } catch (error) {
              if (error.name === 'AbortError') {
                setIdeoError('Compression timeout: process took too long');
              } else {
                setIdeoError(`Compression failed: ${error.message}`);
              }
              setIdeoCompressionStatus((prev) => ({ ...prev, step: 'idle', currentStep: '', progress: 0 }));
            } finally {
              setIdeoCompressing(false);
            }
          }}
          disabled={!ideoFreeText.trim() || ideoCompressing}
        >
          {ideoCompressing ? 'Compressing...' : '🚀 Full Compress & Analyze'}
        </button>

        <button
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          onClick={() => {
            setIdeoCompressionStatus((prev) => ({
              ...prev,
              debugMode: !prev.debugMode,
              step: 'idle',
              currentStep: '',
              progress: 0,
              currentStepIndex: 0,
              pipelineSteps: prev.pipelineSteps.map((step) => ({ ...step, status: 'pending' })),
            }));
          }}
          disabled={ideoCompressing}
        >
          {ideoCompressionStatus.debugMode ? '🔴 Exit Debug Mode' : '🐛 Debug Mode'}
        </button>
      </div>

      {ideoCompressionStatus.debugMode && (
        <div className="w-full mt-4 p-4 bg-gray-800 rounded border border-blue-600">
          <h3 className="text-blue-400 font-semibold mb-3">🔧 Step-by-Step Pipeline (Debug Mode)</h3>
          <div className="space-y-3 mb-4">
            {ideoCompressionStatus.pipelineSteps.map((step, index) => (
              <div
                key={step.id}
                className={`p-3 rounded border ${
                  step.status === 'completed'
                    ? 'border-green-500 bg-green-900/20'
                    : step.status === 'running'
                    ? 'border-blue-500 bg-blue-900/20'
                    : step.status === 'error'
                    ? 'border-red-500 bg-red-900/20'
                    : 'border-gray-600 bg-gray-700/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{index + 1}. {step.name}</div>
                    <div className="text-sm text-gray-300">{step.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        step.status === 'completed'
                          ? 'bg-green-600 text-white'
                          : step.status === 'running'
                          ? 'bg-blue-600 text-white'
                          : step.status === 'error'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-600 text-white'
                      }`}
                    >
                      {step.status === 'completed' ? '✅' : step.status === 'running' ? '🔄' : step.status === 'error' ? '❌' : '⏳'} {step.status}
                    </span>
                    {step.status === 'pending' && index === ideoCompressionStatus.currentStepIndex && (
                      <button
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                        onClick={async () => {
                          if (!ideoFreeText.trim()) return;
                          const bookId = (epubMeta?.isbn && epubMeta.isbn.trim()) || `${(epubMeta?.title || 'Untitled').trim()}|${(epubMeta?.author || '').trim()}`;
                          setIdeoCompressionStatus((prev) => ({
                            ...prev,
                            currentStepIndex: index,
                            currentStep: `Running ${step.name}...`,
                            progress: (index / prev.pipelineSteps.length) * 100,
                          }));
                          setIdeoCompressionStatus((prev) => {
                            const updatedSteps = [...prev.pipelineSteps];
                            updatedSteps[index] = { ...updatedSteps[index], status: 'running' };
                            return { ...prev, pipelineSteps: updatedSteps };
                          });
                          const controller = new AbortController();
                          const timeoutId = setTimeout(() => controller.abort(), 6 * 60 * 1000);
                          try {
                            const response = await API.post(
                              '/api/ideologram/compress/step',
                              {
                                step: step.id,
                                text: ideoFreeText,
                                bookId: `${bookId}_debug`,
                                title: epubMeta?.title || 'Untitled',
                                author: epubMeta?.author || 'Unknown',
                                docType: 'nonfiction',
                              },
                              { signal: controller.signal }
                            );
                            clearTimeout(timeoutId);
                            if (response.data.ok) {
                              setIdeoCompressionStatus((prev) => {
                                const updated = [...prev.pipelineSteps];
                                updated[index] = { ...updated[index], status: 'completed' };
                                return {
                                  ...prev,
                                  pipelineSteps: updated,
                                  currentStep: `${step.name} completed`,
                                  progress: ((index + 1) / prev.pipelineSteps.length) * 100,
                                  stepResults: { ...prev.stepResults, [step.id]: response.data },
                                  canRunNext: index < prev.pipelineSteps.length - 1,
                                };
                              });
                              if (step.id === 'extract') {
                                setIdeoCompressionStatus((prev) => ({
                                  ...prev,
                                  sentences: response.data.sentences || 0,
                                  statements: response.data.statements || 0,
                                  discarded: (response.data.sentences || 0) - (response.data.statements || 0),
                                }));
                              } else if (step.id === 'cluster') {
                                setIdeoCompressionStatus((prev) => ({ ...prev, clusters: response.data.clusters || 0 }));
                              } else if (step.id === 'synthesize') {
                                setIdeoCompressionStatus((prev) => ({
                                  ...prev,
                                  theses: response.data.theses || 0,
                                  coverage: response.data.coverage || 0,
                                  mdlReduction: response.data.mdl_reduction || 0,
                                }));
                              }
                              if (index === ideoCompressionStatus.pipelineSteps.length - 1) {
                                if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                                  const res = await API.get('/api/ideologram/fs');
                                  setFileTree(res.data || null);
                                }
                              }
                            }
                          } catch (error) {
                            clearTimeout(timeoutId);
                            setIdeoCompressionStatus((prev) => {
                              const updated = [...prev.pipelineSteps];
                              updated[index] = { ...updated[index], status: 'error' };
                              return {
                                ...prev,
                                pipelineSteps: updated,
                                currentStep: `${step.name} failed`,
                                errors: [...prev.errors, { step: step.name, error: error.message }],
                              };
                            });
                          }
                        }}
                        disabled={ideoCompressing}
                      >
                        ▶️ Run Step
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs"
              onClick={() => {
                setIdeoCompressionStatus((prev) => ({
                  ...prev,
                  pipelineSteps: prev.pipelineSteps.map((s) => ({ ...s, status: 'pending' })),
                  currentStepIndex: 0,
                  currentStep: '',
                  progress: 0,
                  errors: [],
                }));
              }}
            >
              🔄 Reset Pipeline
            </button>
            <button
              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-xs"
              onClick={async () => {
                if (!ideoFreeText.trim()) return;
                const bookId = (epubMeta?.isbn && epubMeta.isbn.trim()) || `${(epubMeta?.title || 'Untitled').trim()}|${(epubMeta?.author || '').trim()}`;
                try {
                  setIdeoCompressing(true);
                  setIdeoCompressionStatus((prev) => ({ ...prev, currentStep: 'Running debug pipeline...', progress: 0 }));
                  for (let i = 0; i < ideoCompressionStatus.pipelineSteps.length; i++) {
                    const step = ideoCompressionStatus.pipelineSteps[i];
                    setIdeoCompressionStatus((prev) => ({
                      ...prev,
                      currentStepIndex: i,
                      currentStep: `Running ${step.name}...`,
                      progress: (i / prev.pipelineSteps.length) * 100,
                    }));
                    setIdeoCompressionStatus((prev) => {
                      const updated = [...prev.pipelineSteps];
                      updated[i] = { ...updated[i], status: 'running' };
                      return { ...prev, pipelineSteps: updated };
                    });
                    const response = await API.post('/api/ideologram/compress/step', {
                      step: step.id,
                      text: ideoFreeText,
                      bookId: `${bookId}_debug`,
                      title: epubMeta?.title || 'Untitled',
                      author: epubMeta?.author || 'Unknown',
                      docType: 'nonfiction',
                    });
                    if (response.data.ok) {
                      setIdeoCompressionStatus((prev) => {
                        const updated = [...prev.pipelineSteps];
                        updated[i] = { ...updated[i], status: 'completed' };
                        return {
                          ...prev,
                          pipelineSteps: updated,
                          stepResults: { ...prev.stepResults, [step.id]: response.data },
                        };
                      });
                      if (step.id === 'extract') {
                        setIdeoCompressionStatus((prev) => ({
                          ...prev,
                          sentences: response.data.sentences || 0,
                          statements: response.data.statements || 0,
                          discarded: (response.data.sentences || 0) - (response.data.statements || 0),
                        }));
                      } else if (step.id === 'cluster') {
                        setIdeoCompressionStatus((prev) => ({ ...prev, clusters: response.data.clusters || 0 }));
                      } else if (step.id === 'synthesize') {
                        setIdeoCompressionStatus((prev) => ({
                          ...prev,
                          theses: response.data.theses || 0,
                          coverage: response.data.coverage || 0,
                          mdlReduction: response.data.mdl_reduction || 0,
                        }));
                      }
                    }
                  }
                  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                    const res = await API.get('/api/ideologram/fs');
                    setFileTree(res.data || null);
                  }
                } finally {
                  setIdeoCompressing(false);
                }
              }}
            >
              ▶️ Run All Steps
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


