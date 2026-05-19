import { API_URL } from "../socket/socket.js";

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return data;
}

export function createRoom(options = {}) {
  return request("/api/rooms/create", {
    method: "POST",
    body: JSON.stringify(options)
  });
}

export function getRoom(roomId) {
  return request(`/api/rooms/${encodeURIComponent(roomId)}`);
}
