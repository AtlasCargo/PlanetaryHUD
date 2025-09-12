export function parseChatGPTHistory(text) {
  try {
    const jsonData = JSON.parse(text);
    if (jsonData.conversations) {
      return jsonData.conversations
        .flatMap((conv) => (conv.mapping ? Object.values(conv.mapping).filter((msg) => msg.message) : []))
        .map((msg) => ({
          role: msg.message.author.role === 'user' ? 'user' : 'assistant',
          content: msg.message.content?.parts?.[0]?.text || msg.message.content || '',
          timestamp: msg.message.create_time || Date.now(),
        }));
    } else if (jsonData.messages) {
      return jsonData.messages.map((msg) => ({
        role: msg.role || 'user',
        content: msg.content || msg.text || '',
        timestamp: msg.timestamp || msg.created_at || Date.now(),
      }));
    } else if (Array.isArray(jsonData)) {
      return jsonData.map((msg) => ({
        role: msg.role || 'user',
        content: msg.content || msg.text || '',
        timestamp: msg.timestamp || msg.created_at || Date.now(),
      }));
    }
    throw new Error('Unsupported ChatGPT export format');
  } catch {
    const lines = text.split('\n').filter((line) => line.trim());
    const messages = [];
    let currentRole = 'user';
    let currentContent = '';
    for (const line of lines) {
      if (line.toLowerCase().includes('user:') || line.toLowerCase().includes('you:')) {
        if (currentContent.trim()) messages.push({ role: currentRole, content: currentContent.trim(), timestamp: Date.now() });
        currentRole = 'user';
        currentContent = line.replace(/^(user|you):\s*/i, '').trim();
      } else if (line.toLowerCase().includes('assistant:') || line.toLowerCase().includes('chatgpt:') || line.toLowerCase().includes('ai:')) {
        if (currentContent.trim()) messages.push({ role: currentRole, content: currentContent.trim(), timestamp: Date.now() });
        currentRole = 'assistant';
        currentContent = line.replace(/^(assistant|chatgpt|ai):\s*/i, '').trim();
      } else {
        currentContent += (currentContent ? ' ' : '') + line.trim();
      }
    }
    if (currentContent.trim()) messages.push({ role: currentRole, content: currentContent.trim(), timestamp: Date.now() });
    return messages;
  }
}



