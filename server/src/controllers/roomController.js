import { createRoom, getRoom } from "../services/chatStore.js";
import { sanitizeRoomId } from "../utils/sanitize.js";

function buildPublicUrl(req, roomId) {
  const clientUrl = process.env.PUBLIC_CLIENT_URL || process.env.CLIENT_URL || req.get("origin");

  if (!clientUrl) {
    return `/chat/${roomId}`;
  }

  return `${clientUrl.replace(/\/$/, "")}/chat/${roomId}`;
}

export async function createRoomHandler(req, res, next) {
  try {
    const room = await createRoom();

    res.status(201).json({
      roomId: room.roomId,
      link: `/chat/${room.roomId}`,
      url: buildPublicUrl(req, room.roomId),
      expiresAt: room.expiresAt
    });
  } catch (error) {
    next(error);
  }
}

export async function getRoomHandler(req, res, next) {
  try {
    const roomId = sanitizeRoomId(req.params.roomId);

    if (!roomId) {
      res.status(400).json({ active: false, message: "Invalid room id." });
      return;
    }

    const room = await getRoom(roomId);

    if (!room) {
      res.status(404).json({ active: false, message: "Room not found." });
      return;
    }

    res.json({
      roomId: room.roomId,
      active: room.active,
      expiresAt: room.expiresAt
    });
  } catch (error) {
    next(error);
  }
}
