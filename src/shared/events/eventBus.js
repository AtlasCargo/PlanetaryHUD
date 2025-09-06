// Minimal, dependency-free event bus for cross-feature communication.
// API: on(event, handler) -> unsubscribe function; off(event, handler); emit(event, payload); clear().

const createEventBus = () => {
  const listeners = new Map();

  const on = (event, handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => off(event, handler);
  };

  const off = (event, handler) => {
    const set = listeners.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) listeners.delete(event);
    }
  };

  const emit = (event, payload) => {
    const set = listeners.get(event);
    if (!set || set.size === 0) return;
    // Call in insertion order; catch per-listener to avoid cascading failures
    for (const fn of Array.from(set)) {
      try { fn(payload); } catch (_) { /* no-op */ }
    }
  };

  const clear = () => {
    listeners.clear();
  };

  return { on, off, emit, clear };
};

export const eventBus = createEventBus();
export const createScopedBus = () => createEventBus();

export default eventBus;


