import React from 'react';

/**
 * LayoutShell: Minimal wrapper for center content that respects sidebar visibility/widths.
 * This is the first small step towards extracting layout concerns.
 */
export default function LayoutShell({
  leftHidden = false,
  rightHidden = false,
  leftWidthVw = 0,
  rightWidthVw = 0,
  className = '',
  children
}) {
  return (
    <div
      className={`absolute top-0 bottom-0 flex items-center justify-center z-20 ${className}`}
      style={{
        left: !leftHidden ? `${leftWidthVw}vw` : '0',
        right: !rightHidden ? `${rightWidthVw}vw` : '0',
        transition: 'left 0.3s ease-in-out, right 0.3s ease-in-out'
      }}
      data-test="center-pane"
    >
      {children}
    </div>
  );
}


