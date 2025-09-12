import React from 'react';

export default function FileTreeList({ fileTree, fileOpen, filePreviews, onFileClick }) {
  if (!fileTree) return (<div className="text-gray-500 text-xs">No files</div>);

  const renderNode = (node) => {
    if (!node) return null;
    if (node.type === 'dir') {
      const children = Array.isArray(node.children) ? node.children : [];
      return (
        <div>
          <div className="text-xs">📁 {node.name}{node.owner ? ` (${node.owner})` : ''}</div>
          <ul className="list-none m-0 p-0 pl-4">
            {children.length === 0 && (
              <li className="text-gray-500 text-[11px]">(empty)</li>
            )}
            {children.map((c, idx) => (
              <li key={node.name + '::' + (c.name || idx)} className="py-0.5">
                {renderNode(c)}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    const updated = node.updatedAt ? new Date(node.updatedAt).toLocaleString() : '—';
    const size = typeof node.size === 'number' ? `${node.size}B` : '';
    const countStr = node.meta && typeof node.meta.count === 'number' ? `${node.meta.count} ${node.meta.label || ''}` : '';
    return (
      <div className="text-xs">
        <div className="flex items-baseline justify-between gap-2">
          <button className="underline text-left" onClick={() => onFileClick && onFileClick(node.name)}>📄 {node.name} {countStr ? `(${countStr})` : ''}</button>
          <span className="text-gray-400 text-[10px]">{updated}{size ? ` · ${size}` : ''}</span>
        </div>
        {fileOpen?.[node.name] && (
          <div className="mt-1 pl-4">
            {node.name === 'library.json' && Array.isArray(filePreviews?.['library.json']) && (
              <ul className="list-none m-0 p-0 max-h-40 overflow-auto">
                {filePreviews['library.json'].slice(0, 100).map((b, i) => (
                  <li key={i} className="py-0.5 border-b border-gray-800">
                    <span className="font-semibold">{b.title || 'Untitled'}</span> {b.author ? <span className="text-gray-400">by {b.author}</span> : null}
                    {b.rating != null && <span className="ml-2">⭐ {b.rating}</span>}
                  </li>
                ))}
              </ul>
            )}
            {node.name === 'enriched.json' && Array.isArray(filePreviews?.['enriched.json']) && (
              <ul className="list-none m-0 p-0 max-h-40 overflow-auto">
                {filePreviews['enriched.json'].slice(0, 100).map((it, i) => (
                  <li key={i} className="py-0.5 border-b border-gray-800">
                    <span className="font-semibold">{it?.key || 'Item'}</span>
                    {Array.isArray(it?.meta?.topics) && it.meta.topics.length > 0 && (
                      <span className="text-gray-400"> · topics: {it.meta.topics.slice(0,5).join(', ')}{it.meta.topics.length>5?'…':''}</span>
                    )}
                    {Array.isArray(it?.meta?.mainSubjects) && it.meta.mainSubjects.length > 0 && (
                      <span className="text-gray-400"> · subjects: {it.meta.mainSubjects.slice(0,3).join(', ')}{it.meta.mainSubjects.length>3?'…':''}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {node.name === 'scores.json' && Array.isArray(filePreviews?.['scores.json']) && (
              <ul className="list-none m-0 p-0 max-h-40 overflow-auto">
                {filePreviews['scores.json'].slice(0, 100).map((e, i) => (
                  <li key={i} className="py-0.5 border-b border-gray-800">
                    <span className="font-semibold">{e.title || 'Untitled'}</span>
                    <span className="text-gray-400"> · {e.createdAt ? new Date(e.createdAt).toLocaleString() : ''}</span>
                    {e.metrics?.politicalness != null && <span className="ml-2">Politicalness: {Math.round((e.metrics.politicalness||0)*100)}%</span>}
                    {e.axes?.econ_lr != null && <span className="ml-2">econ_lr: {Math.round((e.axes.econ_lr||0)*100)}%</span>}
                  </li>
                ))}
              </ul>
            )}
            {node.name === 'compressed.json' && Array.isArray(filePreviews?.['compressed.json']) && (
              <ul className="list-none m-0 p-0 max-h-40 overflow-auto">
                {filePreviews['compressed.json'].slice(0, 100).map((book, i) => (
                  <li key={i} className="py-0.5 border-b border-gray-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-green-400">{book.title || 'Untitled'}</span>
                        {book.author && <span className="text-gray-400"> by {book.author}</span>}
                      </div>
                      <span className="text-xs text-gray-500">{book.docType || 'nonfiction'}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      📊 {book.stats?.statements || 0} statements · 🎯 {book.stats?.theses || 0} theses · 
                      📅 {book.compressedAt ? new Date(book.compressedAt).toLocaleDateString() : 'N/A'}
                    </div>
                    {book.summary?.theses && book.summary.theses.length > 0 && (
                      <div className="text-xs text-gray-300 mt-1">
                        <span className="text-green-400">Key thesis:</span> {book.summary.theses[0]?.triple?.[0] || 'Subject'} {book.summary.theses[0]?.triple?.[1] || 'predicate'} {book.summary.theses[0]?.triple?.[2] || 'object'}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <ul className="list-none m-0 p-0">
      <li>{renderNode(fileTree)}</li>
    </ul>
  );
}



