import React from 'react';
import RightSidebarHeader from './RightSidebarHeader';
import RightSidebarContent from './RightSidebarContent';
import ResizeHandle from './ResizeHandle';

export default function RightSidebarContainer({ glowEnabled, mode, onCollapse, onStartResizeRight }) {
  return (
    <>
      <RightSidebarHeader
        glowEnabled={glowEnabled}
        title={mode === 'ideologram' ? 'Ideologram' : 'MISSION CONTROL'}
        onCollapse={onCollapse}
      />
      <RightSidebarContent glowEnabled={glowEnabled} />
      <ResizeHandle side="left" onMouseDown={onStartResizeRight} />
    </>
  );
}



