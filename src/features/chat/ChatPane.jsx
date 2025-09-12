import React from 'react';
import ChatWindow from '../../components/ChatWindow';

export default function ChatPane({
  apiError,
  messages,
  onSend,
  sidebarWidths,
  leftHidden,
  rightHidden,
}) {
  const leftMargin = !leftHidden ? `${sidebarWidths.left}vw` : '0';
  const rightMargin = !rightHidden ? `${sidebarWidths.right}vw` : '0';

  return (
    <>
      {apiError && <div className="text-neon-red p-2">Error: {apiError}</div>}
      <ChatWindow
        messages={messages}
        onSend={onSend}
        leftMargin={leftMargin}
        rightMargin={rightMargin}
      />
    </>
  );
}



