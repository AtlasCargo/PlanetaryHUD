// Centralized event name constants and thin payload docs.
// Keep these stable to enable low-coupling across features.

export const Events = {
  // Globe
  GlobeCountryHovered: 'globe.countryHovered', // payload: { country, lat, lng, x, y }
  GlobeReady: 'globe.ready', // payload: { }

  // Dataset
  DatasetSelected: 'dataset.selected', // payload: { id, year?, region? }
  DatasetLoaded: 'dataset.loaded', // payload: { id, series }

  // UI / Tooltip
  UiTooltipShow: 'ui.tooltip.show', // payload: { content, x, y }
  UiTooltipHide: 'ui.tooltip.hide', // payload: { }

  // Theme
  ThemeChanged: 'theme.changed', // payload: { themeId }

  // Chat
  ChatMessageSent: 'chat.messageSent', // payload: { text, role: 'user'|'system'|'assistant', ts }
  ChatMessageReceived: 'chat.messageReceived', // payload: { text, role: 'assistant', ts }

  // Voice (scaffold)
  VoiceRealtimeConnecting: 'voice.realtime.connecting', // payload: {}
  VoiceRealtimeConnected: 'voice.realtime.connected', // payload: { session }
  VoiceRealtimeError: 'voice.realtime.error', // payload: { error }
  VoiceRealtimeVu: 'voice.realtime.vu', // payload: { level: number }
  VoiceRealtimeTextDelta: 'voice.realtime.textDelta', // payload: { text, isFinal? }
  VoiceRealtimeAudioDelta: 'voice.realtime.audioDelta', // payload: { data }

  VoiceTranscribeStart: 'voice.transcribe.start', // payload: {}
  VoiceTranscribeFinal: 'voice.transcribe.final', // payload: { segments, rawText }
  VoiceTranscribeCorrected: 'voice.transcribe.corrected', // payload: { segments, corrections }

  // Avatar / Lip-sync
  VoiceAvatarViseme: 'voice.avatar.viseme', // payload: { tSec, shapes: { JawOpen?: number, MouthWide?: number, MouthPucker?: number } }
};

export default Events;
