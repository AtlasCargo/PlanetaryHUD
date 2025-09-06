// Minimal MCP (Model Context Protocol) client scaffold
// Non-intrusive: not auto-started. Import and call connect() explicitly when ready.

import eventBus from '../events/eventBus';
import { Events } from '../events/contracts';

export function createMcpClient({ url, apiKey, onLog, onOpen } = {}) {
  let socket = null;
  let connected = false;

  const log = (...args) => { try { onLog && onLog(...args); } catch {} };

  const connect = () => {
    try {
      socket = new WebSocket(url);
      socket.onopen = () => { connected = true; log('[MCP] connected'); try { onOpen && onOpen(); } catch {} };
      socket.onclose = () => { connected = false; log('[MCP] disconnected'); };
      socket.onerror = (e) => log('[MCP] error', e?.message || e);
      socket.onmessage = (msg) => handleMessage(msg);
    } catch (e) {
      log('[MCP] connect failed', e?.message || e);
    }
  };

  const send = (type, payload) => {
    if (!connected || !socket) return;
    try { socket.send(JSON.stringify({ type, payload, apiKey })); } catch {}
  };

  const handleMessage = (msg) => {
    try {
      const data = JSON.parse(msg.data || '{}');
      switch (data?.type) {
        case 'dataset.select':
          eventBus.emit(Events.DatasetSelected, data.payload);
          break;
        case 'ui.tooltip':
          if (data.payload?.visible) eventBus.emit(Events.UiTooltipShow, data.payload);
          else eventBus.emit(Events.UiTooltipHide);
          break;
        case 'chat.message':
          eventBus.emit(Events.ChatMessageReceived, data.payload);
          break;
        case 'tasks.lock.changed':
          log('[MCP] lock changed', data.payload || {});
          break;
        case 'tasks.status.update':
          log('[MCP] status update ack', data.payload || {});
          break;
        case 'tasks.heartbeat':
          // Optional server echo
          break;
        case 'tasks.plan.updated':
          log('[MCP] plan updated ack', data.payload || {});
          break;
        default:
          break;
      }
    } catch {}
  };

  // Outbound subscriptions (examples)
  const unsubscribers = [];
  const subscribe = (topics) => {
    if (Array.isArray(topics) && topics.length) {
      send('subscribe', { topics });
    }
    unsubscribers.push(
      eventBus.on(Events.DatasetLoaded, (payload) => send('dataset.loaded', payload)),
      eventBus.on(Events.GlobeCountryHovered, (payload) => send('globe.hover', payload)),
      eventBus.on(Events.ChatMessageSent, (payload) => send('chat.message', payload))
    );
  };

  // Convenience helpers for tasks.* schema
  const sendHeartbeat = (payload) => send('tasks.heartbeat', payload);
  const requestLock = (payload) => send('tasks.lock.request', payload);
  const updateStatus = (payload) => send('tasks.status.update', payload);
  const notifyPlanUpdated = (payload) => send('tasks.plan.updated', payload);
  const notifyBreakingChange = (payload) => send('tasks.breaking_change', payload);
  const notifyPrOpened = (payload) => send('tasks.pr.opened', payload);

  const disconnect = () => {
    try { unsubscribers.forEach((u) => u && u()); } catch {}
    try { socket && socket.close(); } catch {}
    connected = false;
  };

  return { connect, disconnect, subscribe, send, sendHeartbeat, requestLock, updateStatus, notifyPlanUpdated, notifyBreakingChange, notifyPrOpened };
}

export default createMcpClient;

