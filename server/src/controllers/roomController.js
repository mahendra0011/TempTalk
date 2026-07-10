import { createRoom, getRoom } from "../services/chatStore.js";
import { sanitizeRoomId, sanitizeSecret } from "../utils/sanitize.js";
import { validateCreateRoom, validateRoomId } from "../middleware/validation.js";

const defaultPublicClientUrl = "https://temptalk-1.onrender.com";

function getHttpOrigin(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.origin;
    }
  } catch {
    return "";
  }

  return "";
}

function buildPublicUrl(req, roomId) {
  const clientUrl =
    getHttpOrigin(process.env.PUBLIC_CLIENT_URL) ||
    getHttpOrigin(process.env.CLIENT_URL) ||
    getHttpOrigin(req.get("origin")) ||
    defaultPublicClientUrl;

  return `${clientUrl.replace(/\/$/, "")}/chat/${roomId}`;
}

export async function createRoomHandler(req, res, next) {
  try {
    // Use zod validation if available, otherwise fall back to sanitize
    const validated = req.validatedBody || {
      mode: req.body?.mode === "group" ? "group" : "private",
      roomId: sanitizeRoomId(req.body?.roomId),
      secret: sanitizeSecret(req.body?.secret),
      maxPeers: Number(req.body?.maxPeers)
    };

    const mode = validated.mode || "private";
    const roomId = validated.roomId;

    // Validate room ID
    if (!roomId) {
      res.status(400).json({ message: "Room ID must be 4-24 letters, numbers, dashes, or underscores." });
      return;
    }

    // Validate secret is required
    if (!validated.secret) {
      res.status(400).json({ message: "Secret key required." });
      return;
    }

    const room = await createRoom({ roomId, mode, secret: validated.secret, maxPeers: validated.maxPeers });

    res.status(201).json({
      roomId: room.roomId,
      link: `/chat/${room.roomId}`,
      url: buildPublicUrl(req, room.roomId),
      mode: room.mode,
      maxPeers: room.maxPeers,
      requiresSecret: room.requiresSecret,
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
      mode: room.mode,
      maxPeers: room.maxPeers,
      requiresSecret: room.requiresSecret,
      active: room.active,
      expiresAt: room.expiresAt
    });
  } catch (error) {
    next(error);
  }
}