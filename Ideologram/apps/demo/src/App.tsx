import React, { useCallback, useEffect, useMemo, useState } from 'react'
import JSZip from 'jszip'
import { IdeologramWidget } from '@ideologram/widget'
import {
  computeIdeologram,
  SAMPLE_ANCHORS,
  parseGoodreadsCsv,
  type BookInput,
  type QuizResponse,
  type IdeologyVector,
  enrichBook,
  enrichBookWikidata,
  type BookMetadata,
  analyzeTextLexical,
} from '@ideologram/core'

function useHashParams() {
  const [params, setParams] = useState<Record<string, string>>(() => {
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const o: Record<string, string> = {}
    h.forEach((v, k) => { o[k] = v })
    return o
  })
  useEffect(() => {
    const onHashChange = () => {
      const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const o: Record<string, string> = {}
      h.forEach((v, k) => { o[k] = v })
      setParams(o)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  return params
}

export function App() {
  const hash = useHashParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [books, setBooks] = useState<BookInput[]>([])
  const [quiz, setQuiz] = useState<QuizResponse[]>([])
  const [paging, setPaging] = useState<{ total: number; page: number; perPage: number } | null>(null)

  const tokens = useMemo(() => {
    const accessToken = hash.accessToken
    const accessTokenSecret = hash.accessTokenSecret
    const userId = hash.userId
    if (accessToken && accessTokenSecret && userId) return { accessToken, accessTokenSecret, userId }
    return null
  }, [hash])

  const authBase = useMemo(() => {
    const url = new URL(window.location.href)
    const a = url.searchParams.get('auth')
    return a || 'http://localhost:4321'
  }, [])

  const handleLogin = useCallback(() => {
    const redirect = window.location.href
    const url = new URL(authBase + '/auth/start')
    url.searchParams.set('redirect', redirect)
    window.location.href = url.toString()
  }, [authBase])

  const fetchRead = useCallback(async (page = 1) => {
    if (!tokens) return
    setLoading(true)
    setError(null)
    try {
      const url = new URL(authBase + '/export/read')
      url.searchParams.set('accessToken', tokens.accessToken)
      url.searchParams.set('accessTokenSecret', tokens.accessTokenSecret)
      url.searchParams.set('userId', tokens.userId)
      url.searchParams.set('per_page', '200')
      url.searchParams.set('page', String(page))
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`Export failed: ${res.status}`)
      const data = await res.json()
      setBooks(data.books || [])
      if (data.paging) setPaging({ total: data.paging.total, page: data.paging.page, perPage: data.paging.perPage })
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [tokens, authBase])

  const onCsvSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setLoading(true)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result || '')
        const parsed = parseGoodreadsCsv(text)
        setBooks(parsed)
        setPaging(null)
      } catch (err: any) {
        setError(err?.message || 'Failed to parse CSV')
      } finally {
        setLoading(false)
      }
    }
    reader.onerror = () => {
      setLoading(false)
      setError('Failed to read CSV file')
    }
    reader.readAsText(f)
  }, [])

  const computeNow = useCallback(() => {
    const r = computeIdeologram({
      books,
      anchors: SAMPLE_ANCHORS,
      quizResponses: quiz,
      options: {
        fictionPolicy: 'discount',
        fictionBaseWeight: 0.2,
        fictionThresholdCount: 8,
        recencyHalfLifeYears: 5,
      }
    })
    console.log('Computed ideologram:', r)
    return r
  }, [books, quiz])

  const readBooks = useMemo(() => {
    return books.filter((b) => b.isRead ?? (b.readingStatus === 'read' || b.dateRead != null))
  }, [books])

  const ratedReadBooks = useMemo(() => {
    return readBooks.filter((b) => b.rating != null)
  }, [readBooks])

  const [enriched, setEnriched] = useState<Record<string, { meta: BookMetadata; axes: Record<string, number> }>>({})

  const enrichTopRead = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const toEnrich = readBooks.slice(0, 20)
      const results = await Promise.all(toEnrich.map(async (b) => {
        const r = await enrichBook(b)
        return { key: `${b.title}::${b.author || ''}`, r }
      }))
      const map: Record<string, { meta: BookMetadata; axes: Record<string, number> }> = {}
      for (const { key, r } of results) {
        if (!r) continue
        map[key] = { meta: r.metadata, axes: r.inferredAxes || {} }
      }
      setEnriched(map)
    } catch (e: any) {
      setError(e?.message || 'Failed to enrich')
    } finally {
      setLoading(false)
    }
  }, [readBooks])

  const enrichTopReadWikidata = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const toEnrich = readBooks.slice(0, 20)
      const results = await Promise.all(toEnrich.map(async (b) => {
        const r = await enrichBook(b) // prefer Open Library first
        const key = `${b.title}::${b.author || ''}`
        return { key, r }
      }))
      const map: Record<string, { meta: BookMetadata; axes: Record<string, number> }> = { ...enriched }
      for (const { key, r } of results) {
        if (r) map[key] = { meta: r.metadata, axes: r.inferredAxes || {} }
      }
      setEnriched(map)
    } catch (e: any) {
      setError(e?.message || 'Failed to enrich via Wikidata')
    } finally {
      setLoading(false)
    }
  }, [readBooks, enriched])

  // Simple text analyzer state
  const [freeText, setFreeText] = useState('')
  const [textResult, setTextResult] = useState<ReturnType<typeof analyzeTextLexical> | null>(null)
  const [epubName, setEpubName] = useState('')
  const [epubMeta, setEpubMeta] = useState<{ title?: string; author?: string; isbn?: string } | null>(null)
  const [lastAutoSavedKey, setLastAutoSavedKey] = useState<string>('')

  const saveScore = useCallback(async (method: string, reliability: number) => {
    if (!textResult) return false
    try {
      const dbRaw = localStorage.getItem('ideologram:scores:v1')
      const db = dbRaw ? JSON.parse(dbRaw) : { entries: [] as any[] }
      const entry = {
        id: epubMeta?.isbn || `${epubMeta?.title || 'Untitled'}|${epubMeta?.author || ''}`,
        isbn: epubMeta?.isbn,
        title: epubMeta?.title,
        author: epubMeta?.author,
        source: epubName ? 'epub' : 'text',
        method,
        reliability,
        fileName: epubName || undefined,
        createdAt: new Date().toISOString(),
        metrics: textResult.metrics,
        axes: textResult.axes,
        termHits: textResult.termHits,
        axisTermContribs: textResult.axisTermContribs,
        metricTermContribs: textResult.metricTermContribs,
      }
      db.entries.push(entry)
      localStorage.setItem('ideologram:scores:v1', JSON.stringify(db))
      try {
        const res = await fetch('http://localhost:4545/v1/scores', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: entry.id,
            isbn: entry.isbn,
            title: entry.title,
            author: entry.author,
            source: entry.source,
            method: entry.method,
            reliability: entry.reliability,
            metrics: entry.metrics,
            axes: entry.axes,
            termHits: entry.termHits,
            axisTermContribs: entry.axisTermContribs,
            metricTermContribs: entry.metricTermContribs,
          })
        })
        if (!res.ok) console.warn('Scores API rejected save')
      } catch {}
      return true
    } catch {
      return false
    }
  }, [textResult, epubMeta, epubName])

  const onTxtSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setLoading(true)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      setLoading(false)
      setFreeText(String(reader.result || ''))
    }
    reader.onerror = () => {
      setLoading(false)
      setError('Failed to read .txt file')
    }
    reader.readAsText(f)
  }, [])

  const runTextAnalyze = useCallback(() => {
    const r = analyzeTextLexical(freeText)
    setTextResult(r)
  }, [freeText])

  // Auto-save analyzed EPUB/text results to local + server once per unique (id+hash)
  useEffect(() => {
    if (!textResult) return
    const id = epubMeta?.isbn || `${epubMeta?.title || 'Untitled'}|${epubMeta?.author || ''}`
    const fingerprint = id + '|' + JSON.stringify(textResult.metrics) + '|' + JSON.stringify(textResult.axes)
    if (!id || fingerprint === lastAutoSavedKey) return
    ;(async () => {
      const ok = await saveScore('lexical-v1', 0.4)
      if (ok) setLastAutoSavedKey(fingerprint)
    })()
  }, [textResult, epubMeta, lastAutoSavedKey, saveScore])

  const onEpubSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setLoading(true)
    setError(null)
    try {
      setEpubName(f.name)
      const buf = await f.arrayBuffer()
      const zip = await JSZip.loadAsync(buf)
      // Try to locate OPF via container.xml
      let opfPath: string | undefined
      const containerXml = await zip.file('META-INF/container.xml')?.async('string')
      if (containerXml) {
        const m = containerXml.match(/full-path="([^"]+)"/)
        if (m) opfPath = m[1]
      }
      if (!opfPath) {
        opfPath = Object.keys(zip.files).find((p) => /\.opf$/i.test(p))
      }
      let meta: { title?: string; author?: string; isbn?: string } = {}
      if (opfPath) {
        const opf = await zip.file(opfPath)?.async('string')
        if (opf) {
          const titleMatch = opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)
          const creatorMatch = opf.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i)
          meta.title = titleMatch ? titleMatch[1].trim() : undefined
          meta.author = creatorMatch ? creatorMatch[1].trim() : undefined
          // Extract potential ISBNs
          const ids = Array.from(opf.matchAll(/<dc:identifier[^>]*>([\s\S]*?)<\/dc:identifier>/gi)).map((m) => m[1])
          const textBlob = ids.join(' ') + ' ' + opf
          const isbnCandidates = Array.from(textBlob.matchAll(/\b(?:97[89][-\s]?)?[0-9][-0-9\s]{8,}[0-9Xx]\b/g)).map((m) => m[0])
          const normalized = isbnCandidates.map((s) => s.replace(/[^0-9Xx]/g, ''))
          const isbn13 = normalized.find((s) => /^97[89][0-9]{10}$/.test(s))
          const isbn10 = normalized.find((s) => /^[0-9]{9}[0-9Xx]$/.test(s))
          meta.isbn = isbn13 || isbn10
        }
      }
      setEpubMeta(meta)
      // Naive text extraction: concatenate all .xhtml/.html files
      const textFiles = Object.keys(zip.files).filter((p) => /\.(x?html|htm)$/i.test(p))
      let combined = ''
      for (const p of textFiles) {
        const file = zip.file(p)
        if (!file) continue
        const html = await file.async('string')
        const stripped = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
        combined += ' ' + stripped
      }
      setFreeText(combined)
    } catch (err: any) {
      setError(err?.message || 'Failed to parse EPUB')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="page" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Upload Goodreads CSV</h2>
        <p style={{ marginTop: 0, color: '#9ca3af' }}>Since Goodreads API access is no longer available, upload your exported CSV of "Read" books.</p>
        <div className="row">
          <input type="file" accept=".csv,text/csv" onChange={onCsvSelected} />
          {loading && <span>Parsing…</span>}
        </div>
        <div style={{ marginTop: 8 }}>Loaded books: {books.length}</div>
        {error && <div style={{ color: '#fca5a5' }}>{error}</div>}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Read books</h2>
        <p style={{ marginTop: 0, color: '#9ca3af' }}>
          Showing books detected as read. Only read and rated books are used by default in the compute.
        </p>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <span>Total loaded: {books.length}</span>
          <span>Read: {readBooks.length}</span>
          <span>Rated (read): {ratedReadBooks.length}</span>
        </div>
        <div style={{ marginTop: 8, maxHeight: 260, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
          {readBooks.length === 0 && (
            <div style={{ color: '#6b7280' }}>No read books detected yet. Upload a CSV above.</div>
          )}
          {readBooks.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {readBooks.slice(0, 200).map((b, i) => {
                const key = `${b.title}::${b.author || ''}`
                const info = enriched[key]
                return (
                <li key={`${b.title}-${i}`} style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <strong style={{ marginRight: 6 }}>{b.title}</strong>
                    {b.author && <span style={{ color: '#6b7280' }}>by {b.author}</span>}
                    {b.rating != null && <span style={{ marginLeft: 'auto' }}>⭐ {b.rating}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {b.dateRead && <span>Date read: {b.dateRead}</span>}
                    {b.shelves && b.shelves.length > 0 && (
                      <span>Shelves: {b.shelves.slice(0, 4).join(', ')}{b.shelves.length > 4 ? '…' : ''}</span>
                    )}
                    {info?.meta?.isFictionInferred !== undefined && (
                      <span>OL says: {info.meta.isFictionInferred ? 'Fiction' : 'Non-fiction'}</span>
                    )}
                  </div>
                  {info && (
                    <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>
                      {info.meta.topics && info.meta.topics.length > 0 && (
                        <div>Topics: {info.meta.topics.slice(0, 6).join(', ')}{info.meta.topics.length > 6 ? '…' : ''}</div>
                      )}
                    </div>
                  )}
                </li>
                )})}
              {readBooks.length > 200 && (
                <li style={{ padding: '6px 0', color: '#6b7280' }}>+ {readBooks.length - 200} more…</li>
              )}
            </ul>
          )}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button onClick={enrichTopRead} disabled={loading || readBooks.length === 0}>Enrich top 20 via Open Library</button>
          <button onClick={enrichTopReadWikidata} disabled={loading || readBooks.length === 0}>Enrich via Wikidata</button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Widget</h2>
        <p style={{ marginTop: 0 }}>Loaded books: {books.length}</p>
        <IdeologramWidget
          mode="both"
          books={books}
          anchors={SAMPLE_ANCHORS}
          autoCompute={false}
          onComplete={(r: IdeologyVector) => console.log('Widget result:', r)}
        />
        <div className="row" style={{ marginTop: 8 }}>
          <button onClick={computeNow}>Compute (headless)</button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Analyze free text (.txt or paste)</h2>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input type="file" accept=".txt,text/plain" onChange={onTxtSelected} />
          <button onClick={runTextAnalyze} disabled={loading || freeText.length === 0}>Analyze text</button>
          <span style={{ color: '#6b7280' }}>Chars: {freeText.length}</span>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <input type="file" accept=".epub,application/epub+zip" onChange={onEpubSelected} />
          {epubName && <span style={{ color: '#6b7280' }}>EPUB: {epubName}</span>}
        </div>
        {epubMeta && (
          <div style={{ marginTop: 8, fontSize: 13, color: '#374151' }}>
            <div>Title: {epubMeta.title || '—'}</div>
            <div>Author: {epubMeta.author || '—'}</div>
            <div>ISBN: {epubMeta.isbn || '—'}</div>
          </div>
        )}
        <textarea value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="Paste text here" style={{ width: '100%', minHeight: 120, marginTop: 8 }} />
        {textResult && (
          <div style={{ marginTop: 8, border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span>Politicalness: {(textResult.metrics.politicalness * 100).toFixed(0)}%</span>
              <span>Ideologicalness: {(textResult.metrics.ideologicalness * 100).toFixed(0)}%</span>
              <span>Educatedness: {(textResult.metrics.educatedness * 100).toFixed(0)}%</span>
              <span>Religiousness: {(textResult.metrics.religiousness * 100).toFixed(0)}%</span>
              <span>Romanticalness: {(textResult.metrics.romanticalness * 100).toFixed(0)}%</span>
              <span>Sentiment: {(textResult.metrics.positivity * 100).toFixed(0)}%</span>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Axes (lexical):</div>
              <div style={{ fontSize: 12, color: '#374151' }}>
                econ_lr: {((textResult.axes.econ_lr ?? 0) * 100).toFixed(0)}% ·
                cult_libcon: {((textResult.axes.cult_libcon ?? 0) * 100).toFixed(0)}% ·
                auth_lib: {((textResult.axes.auth_lib ?? 0) * 100).toFixed(0)}% ·
                global_local: {((textResult.axes.global_local ?? 0) * 100).toFixed(0)}% ·
                tech_prog: {((textResult.axes.tech_prog ?? 0) * 100).toFixed(0)}% ·
                epistemic_rat: {((textResult.axes.epistemic_rat ?? 0) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button onClick={async () => {
                const ok = await saveScore('lexical-v1', 0.4)
                alert(ok ? 'Saved score to local database' : 'Failed to save')
              }}>Save score to local DB</button>
            </div>
          </div>
        )}
      </div>

      <SavedDbPanel />

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Notes</h3>
        <ul>
          <li>Fiction is discounted by default unless whitelisted or sufficiently numerous.</li>
          <li>You can change auth server via <code>?auth=http://localhost:4321</code>.</li>
        </ul>
      </div>
    </div>
  )
}

function SavedDbPanel() {
  const [entries, setEntries] = useState<any[]>([])
  const load = useCallback(() => {
    try {
      const dbRaw = localStorage.getItem('ideologram:scores:v1')
      const db = dbRaw ? JSON.parse(dbRaw) : { entries: [] }
      setEntries(db.entries || [])
    } catch {
      setEntries([])
    }
  }, [])
  useEffect(() => { load() }, [load])
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Saved scores (local)</h2>
      <div className="row" style={{ gap: 8 }}>
        <button onClick={load}>Reload</button>
        <button onClick={() => { localStorage.removeItem('ideologram:scores:v1'); load() }}>Clear</button>
      </div>
      <div style={{ marginTop: 8, maxHeight: 200, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
        {entries.length === 0 ? (
          <div style={{ padding: 8, color: '#6b7280' }}>No saved entries</div>
        ) : (
          <table style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 6 }}>When</th>
                <th style={{ textAlign: 'left', padding: 6 }}>Title</th>
                <th style={{ textAlign: 'left', padding: 6 }}>Author</th>
                <th style={{ textAlign: 'left', padding: 6 }}>ISBN</th>
                <th style={{ textAlign: 'left', padding: 6 }}>Source</th>
                <th style={{ textAlign: 'left', padding: 6 }}>Politicalness</th>
                <th style={{ textAlign: 'left', padding: 6 }}>econ_lr</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice().reverse().map((e, i) => (
                <tr key={i}>
                  <td style={{ padding: 6 }}>{new Date(e.createdAt).toLocaleString()}</td>
                  <td style={{ padding: 6 }}>{e.title || 'Untitled'}</td>
                  <td style={{ padding: 6 }}>{e.author || '—'}</td>
                  <td style={{ padding: 6 }}>{e.isbn || '—'}</td>
                  <td style={{ padding: 6 }}>{e.source}</td>
                  <td style={{ padding: 6 }}>{Math.round((e.metrics?.politicalness || 0) * 100)}%</td>
                  <td style={{ padding: 6 }}>{Math.round((e.axes?.econ_lr || 0) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
