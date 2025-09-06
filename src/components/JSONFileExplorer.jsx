import React, { useState, useMemo } from 'react';

/**
 * JSONFileExplorer
 * 
 * A simple file-system-like explorer for nested JSON data.
 * Supports uploading a .json file, collapsing/expanding nodes, and searching keys/values.
 */
export default function JSONFileExplorer() {
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  // Load JSON file from file input
  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        setData(json);
        setExpanded(new Set(['root']));
        setSearchTerm('');
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  // Toggle expand/collapse by path
  const togglePath = (path) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Filter JSON tree by search term (keys or primitive values)
  const filterTree = (node) => {
    if (!searchTerm) return node;
    const term = searchTerm.toLowerCase();
    if (node && typeof node === 'object') {
      if (Array.isArray(node)) {
        const filtered = node.map(filterTree).filter(n => n !== null);
        return filtered.length ? filtered : null;
      }
      const entries = Object.entries(node).reduce((acc, [k, v]) => {
        const fn = filterTree(v);
        if (fn !== null || k.toLowerCase().includes(term)) acc[k] = fn !== null ? fn : v;
        return acc;
      }, {});
      return Object.keys(entries).length ? entries : null;
    }
    // primitive
    const str = String(node).toLowerCase();
    return str.includes(term) ? node : null;
  };

  const filtered = useMemo(() => filterTree(data), [data, searchTerm]);

  // Recursive render
  const renderNode = (node, name, path) => {
    const isObject = node && typeof node === 'object';
    const isArray = Array.isArray(node);
    if (isObject) {
      const children = isArray ? node.map((v, i) => [i, v]) : Object.entries(node);
      const isOpen = expanded.has(path);
      return (
        <div key={path} className="ml-2">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => togglePath(path)}
          >
            <span className="mr-1">{isOpen ? '📂' : '📁'}</span>
            <span className="font-bold">{name}</span>
          </div>
          {isOpen && (
            <div className="ml-4">
              {children.map(([k, v]) => renderNode(v, k, `${path}.${k}`))}
            </div>
          )}
        </div>
      );
    }
    // leaf node
    return (
      <div key={path} className="ml-6 flex items-center text-xs">
        <span className="mr-1">📄</span>
        <span className="font-medium">{name}:</span>
        <span className="ml-1 text-green-400 truncate">{String(node)}</span>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-2 flex items-center">
        <input
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="text-xs text-gray-300"
        />
        {data && (
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="ml-2 p-1 rounded bg-gray-800 text-white text-xs flex-1"
          />
        )}
      </div>
      <div className="max-h-80 overflow-auto text-white text-xs">
        {data ? (
          filtered ? renderNode(filtered, 'root', 'root') : (
            <div className="text-gray-500 text-xs">No matching results</div>
          )
        ) : (
          <div className="text-gray-500 text-xs">Upload a JSON file to explore</div>
        )}
      </div>
    </div>
  );
}