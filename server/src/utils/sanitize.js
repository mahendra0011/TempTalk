const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;
const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,24}$/;

export function sanitizeText(value, maxLength = 1000) {
  return String(value ?? "")
    .replace(CONTROL_CHARS, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeUsername(value) {
  const cleaned = sanitizeText(value, 24).replace(/[^\w\s.-]/g, "");
  return cleaned || null;
}

export function sanitizeRoomId(value) {
  const cleaned = sanitizeText(value, 24);
  return ROOM_ID_PATTERN.test(cleaned) ? cleaned : null;
}

export function sanitizeSecret(value) {
  return sanitizeText(value, 64);
}
