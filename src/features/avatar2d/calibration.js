// Lightweight per-image calibration storage for 2D avatar (bella.png etc.)
// Stores anchors in localStorage under key `avatar2d:calib:<imgKey>`

const KEY_PREFIX = 'avatar2d:calib:';

export function getCalibration(imgKey) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + imgKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCalibration(imgKey, data) {
  try {
    localStorage.setItem(KEY_PREFIX + imgKey, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// Default guess (centered) if no auto-detect available
export function defaultCalibration(imgWidth, imgHeight) {
  const w = imgWidth, h = imgHeight;
  const cx = w * 0.5;
  const cy = h * 0.62; // lower than center for mouth
  const mouthW = w * 0.28;
  const mouthH = h * 0.06;
  return {
    leftCorner: { x: cx - mouthW / 2, y: cy },
    rightCorner: { x: cx + mouthW / 2, y: cy },
    topLip: { x: cx, y: cy - mouthH / 2 },
    bottomLip: { x: cx, y: cy + mouthH / 2 },
  };
}

