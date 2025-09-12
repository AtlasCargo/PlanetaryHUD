import React from 'react';
import FileTreeList from './FileTreeList';

export default function SidebarFilesPanel({ user, onRefresh, fileTree, fileOpen, filePreviews, onFileClick, renderFileTreeList }) {
  return (
    <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 mb-4">
      <h3 className="text-sm font-bold text-neon-blue mb-2">Ideologram Files</h3>
      <button className="mb-2 px-2 py-1 bg-gray-700 rounded" onClick={onRefresh}>Refresh</button>
      <div className="text-gray-300" style={{ maxHeight: 160, overflow: 'auto' }}>
        {typeof renderFileTreeList === 'function' ? renderFileTreeList() : (
          <FileTreeList fileTree={fileTree} fileOpen={fileOpen} filePreviews={filePreviews} onFileClick={onFileClick} />
        )}
      </div>
    </div>
  );
}


