const aliases = ["Cipher", "Vanta", "Nova", "Ghost", "Zero", "Pulse", "Echo", "Shade"];

export function getIdentity(roomId) {
  const key = `temptalk:${roomId}:identity`;
  const existing = sessionStorage.getItem(key);

  if (existing) {
    return JSON.parse(existing);
  }

  const username = `${aliases[Math.floor(Math.random() * aliases.length)]}-${Math.floor(
    100 + Math.random() * 900
  )}`;
  const identity = { username };

  sessionStorage.setItem(key, JSON.stringify(identity));
  return identity;
}
