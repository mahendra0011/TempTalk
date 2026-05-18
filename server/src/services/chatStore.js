import { createHash } from "crypto";
import { nanoid } from "nanoid";
import { isMongoReady } from "../config/db.js";
import Message from "../models/Message.js";
import Room from "../models/Room.js";
import { deleteAttachmentFile, deleteRoomUploads } from "./fileStore.js";

const memoryRooms = new Map();
const memoryMessages = new Map();
const memoryTimers = new Map();

const roomTtlMinutes = Number(process.env.ROOM_TTL_MINUTES ?? 1440);
const messageTtlMinutes = Number(process.env.MESSAGE_TTL_MINUTES ?? roomTtlMinutes);
const roomTtlMs = roomTtlMinutes > 0 ? roomTtlMinutes * 60 * 1000 : null;
const messageTtlMs = messageTtlMinutes > 0 ? messageTtlMinutes * 60 * 1000 : roomTtlMs;
const defaultPrivatePeers = Number(process.env.MAX_ROOM_PEERS || 2);
const defaultGroupPeers = Number(process.env.MAX_GROUP_PEERS || 12);
const absoluteMaxGroupPeers = Number(process.env.ABSOLUTE_MAX_GROUP_PEERS || 100);
const messageHistoryLimit = Math.max(Number(process.env.MESSAGE_HISTORY_LIMIT ?? 1000), 0);
const seenBatchLimit = Math.max(Number(process.env.SEEN_BATCH_LIMIT ?? 500), 1);

function dateAfter(ms) {
  if (!ms) {
    return null;
  }

  return new Date(Date.now() + ms);
}

function serializeDoc(doc) {
  if (!doc) {
    return null;
  }

  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const { secretHash, ...safePlain } = plain;

  return {
    ...safePlain,
    _id: undefined,
    __v: undefined,
    requiresSecret: Boolean(secretHash),
    expiresAt: plain.expiresAt?.toISOString?.() ?? plain.expiresAt,
    createdAt: plain.createdAt?.toISOString?.() ?? plain.createdAt,
    updatedAt: plain.updatedAt?.toISOString?.() ?? plain.updatedAt
  };
}

function hashSecret(secret) {
  return createHash("sha256").update(String(secret)).digest("hex");
}

function clampPeers(value, mode) {
  const fallback = mode === "group" ? defaultGroupPeers : defaultPrivatePeers;
  const min = mode === "group" ? 3 : 2;
  const max = mode === "group" ? Math.max(absoluteMaxGroupPeers, min) : 2;
  const number = Number(value || fallback);

  return Math.min(Math.max(Number.isFinite(number) ? number : fallback, min), max);
}

function serializeMessage(message) {
  const serialized = serializeDoc(message);

  if (!serialized) {
    return null;
  }

  serialized.reactions = serialized.reactions || [];
  serialized.readBy = serialized.readBy || [];
  serialized.replyTo = serialized.replyTo || null;
  serialized.attachment = serialized.attachment || null;
  serialized.editedAt = serialized.editedAt?.toISOString?.() ?? serialized.editedAt ?? null;
  serialized.deletedAt = serialized.deletedAt?.toISOString?.() ?? serialized.deletedAt ?? null;
  delete serialized.requiresSecret;

  return serialized;
}

function isExpired(record) {
  return !record || (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now());
}

function activeExpiryFilter() {
  return {
    $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }, { expiresAt: { $exists: false } }]
  };
}

function scheduleMemoryDeletion(roomId, expiresAt) {
  clearTimeout(memoryTimers.get(roomId));

  if (!expiresAt) {
    memoryTimers.delete(roomId);
    return;
  }

  const delay = Math.max(new Date(expiresAt).getTime() - Date.now(), 0);
  const timer = setTimeout(() => {
    memoryRooms.delete(roomId);
    memoryMessages.delete(roomId);
    memoryTimers.delete(roomId);
    deleteRoomUploads(roomId).catch(() => {});
  }, delay);

  memoryTimers.set(roomId, timer);
}

function cleanupMemoryRoom(roomId) {
  const room = memoryRooms.get(roomId);

  if (isExpired(room)) {
    memoryRooms.delete(roomId);
    memoryMessages.delete(roomId);
    clearTimeout(memoryTimers.get(roomId));
    memoryTimers.delete(roomId);
    deleteRoomUploads(roomId).catch(() => {});
    return null;
  }

  const messages = memoryMessages.get(roomId) || [];
  memoryMessages.set(
    roomId,
    messages.filter((message) => !isExpired(message))
  );

  return room;
}

async function roomExists(roomId) {
  if (isMongoReady()) {
    return Boolean(await Room.exists({ roomId }));
  }

  return Boolean(cleanupMemoryRoom(roomId));
}

export async function createRoom(options = {}) {
  let roomId = nanoid(6);

  while (await roomExists(roomId)) {
    roomId = nanoid(6);
  }

  const mode = options.mode === "group" ? "group" : "private";
  const secret = String(options.secret || "").trim();
  const room = {
    roomId,
    mode,
    maxPeers: clampPeers(options.maxPeers, mode),
    secretHash: mode === "group" && secret ? hashSecret(secret) : null,
    users: [],
    active: true,
    expiresAt: dateAfter(roomTtlMs),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (isMongoReady()) {
    const created = await Room.create(room);
    return serializeDoc(created);
  }

  memoryRooms.set(roomId, room);
  memoryMessages.set(roomId, []);
  scheduleMemoryDeletion(roomId, room.expiresAt);

  return serializeDoc(room);
}

export async function verifyRoomAccess(roomId, secret) {
  const rawRoom = isMongoReady()
    ? await Room.findOne({
        roomId,
        active: true,
        ...activeExpiryFilter()
      }).lean()
    : cleanupMemoryRoom(roomId);

  if (!rawRoom?.active) {
    return {
      ok: false,
      reason: "missing-room",
      message: "Room is unavailable."
    };
  }

  if (!rawRoom.secretHash) {
    return {
      ok: true,
      room: serializeDoc(rawRoom)
    };
  }

  const cleanSecret = String(secret || "").trim();
  if (!cleanSecret) {
    return {
      ok: false,
      reason: "secret-required",
      room: serializeDoc(rawRoom),
      message: "Secret key required."
    };
  }

  if (hashSecret(cleanSecret) !== rawRoom.secretHash) {
    return {
      ok: false,
      reason: "invalid-secret",
      room: serializeDoc(rawRoom),
      message: "Secret key is incorrect."
    };
  }

  return {
    ok: true,
    room: serializeDoc(rawRoom)
  };
}

export async function getRoom(roomId) {
  if (isMongoReady()) {
    const room = await Room.findOne({
      roomId,
      active: true,
      ...activeExpiryFilter()
    }).lean();

    return serializeDoc(room);
  }

  const room = cleanupMemoryRoom(roomId);
  return room?.active ? serializeDoc(room) : null;
}

export async function addUserToRoom(roomId, user) {
  if (isMongoReady()) {
    await Room.updateOne(
      { roomId, active: true },
      {
        $pull: { users: { socketId: user.socketId } }
      }
    );

    await Room.updateOne(
      { roomId, active: true },
      {
        $push: { users: user }
      }
    );
    return;
  }

  const room = cleanupMemoryRoom(roomId);
  if (!room) {
    return;
  }

  room.users = room.users.filter((existing) => existing.socketId !== user.socketId);
  room.users.push(user);
  room.updatedAt = new Date();
}

export async function removeUserFromRoom(roomId, socketId) {
  if (isMongoReady()) {
    await Room.updateOne({ roomId }, { $pull: { users: { socketId } } });
    return;
  }

  const room = cleanupMemoryRoom(roomId);
  if (!room) {
    return;
  }

  room.users = room.users.filter((user) => user.socketId !== socketId);
  room.updatedAt = new Date();
}

export async function getMessage(roomId, messageId) {
  if (isMongoReady()) {
    const message = await Message.findOne({
      roomId,
      messageId,
      ...activeExpiryFilter()
    }).lean();

    return serializeMessage(message);
  }

  cleanupMemoryRoom(roomId);
  const messages = memoryMessages.get(roomId) || [];
  return serializeMessage(messages.find((message) => message.messageId === messageId));
}

export async function createMessage({ roomId, sender, text, replyTo = null, attachment = null }) {
  const now = new Date();
  const message = {
    messageId: nanoid(12),
    roomId,
    sender,
    text,
    attachment,
    replyTo,
    reactions: [],
    readBy: [{ username: sender, seenAt: now }],
    editedAt: null,
    deletedAt: null,
    expiresAt: dateAfter(messageTtlMs),
    createdAt: now,
    updatedAt: now
  };

  if (isMongoReady()) {
    const created = await Message.create(message);
    return serializeMessage(created);
  }

  cleanupMemoryRoom(roomId);
  const messages = memoryMessages.get(roomId) || [];
  messages.push(message);
  memoryMessages.set(roomId, messages);

  return serializeMessage(message);
}

export async function getMessages(roomId) {
  if (isMongoReady()) {
    let query = Message.find({
      roomId,
      ...activeExpiryFilter()
    })
      .sort({ createdAt: 1 })
      .lean();

    if (messageHistoryLimit > 0) {
      query = query.limit(messageHistoryLimit);
    }

    const messages = await query;

    return messages.map(serializeMessage);
  }

  cleanupMemoryRoom(roomId);
  return (memoryMessages.get(roomId) || []).map(serializeMessage);
}

function findMemoryMessage(roomId, messageId) {
  cleanupMemoryRoom(roomId);
  const messages = memoryMessages.get(roomId) || [];
  const message = messages.find((item) => item.messageId === messageId);
  return message || null;
}

export async function editMessage({ roomId, messageId, sender, text }) {
  const now = new Date();

  if (isMongoReady()) {
    const updated = await Message.findOneAndUpdate(
      { roomId, messageId, sender, deletedAt: null },
      { $set: { text, editedAt: now, updatedAt: now } },
      { new: true }
    );

    return serializeMessage(updated);
  }

  const message = findMemoryMessage(roomId, messageId);
  if (!message || message.sender !== sender || message.deletedAt) {
    return null;
  }

  message.text = text;
  message.editedAt = now;
  message.updatedAt = now;

  return serializeMessage(message);
}

export async function deleteMessage({ roomId, messageId, sender }) {
  const now = new Date();

  if (isMongoReady()) {
    const message = await Message.findOne({ roomId, messageId, sender, deletedAt: null });

    if (!message) {
      return null;
    }

    const attachment = message.attachment;
    message.text = "";
    message.attachment = null;
    message.reactions = [];
    message.deletedAt = now;
    message.updatedAt = now;
    await message.save();
    await deleteAttachmentFile(attachment);

    return serializeMessage(message);
  }

  const message = findMemoryMessage(roomId, messageId);
  if (!message || message.sender !== sender || message.deletedAt) {
    return null;
  }

  const attachment = message.attachment;
  message.text = "";
  message.attachment = null;
  message.reactions = [];
  message.deletedAt = now;
  message.updatedAt = now;
  await deleteAttachmentFile(attachment);

  return serializeMessage(message);
}

function toggleReactionGroups(reactions, emoji, username) {
  let alreadyReacted = false;
  const cleaned = (reactions || [])
    .map((reaction) => {
      const users = (reaction.users || []).filter((user) => user.username !== username);

      if (reaction.emoji === emoji && users.length !== (reaction.users || []).length) {
        alreadyReacted = true;
      }

      return {
        emoji: reaction.emoji,
        users
      };
    })
    .filter((reaction) => reaction.users.length > 0);

  if (!alreadyReacted) {
    const existing = cleaned.find((reaction) => reaction.emoji === emoji);

    if (existing) {
      existing.users.push({ username, reactedAt: new Date() });
    } else {
      cleaned.push({
        emoji,
        users: [{ username, reactedAt: new Date() }]
      });
    }
  }

  return cleaned;
}

export async function reactToMessage({ roomId, messageId, username, emoji }) {
  if (isMongoReady()) {
    const message = await Message.findOne({ roomId, messageId, deletedAt: null });

    if (!message) {
      return null;
    }

    message.reactions = toggleReactionGroups(message.reactions, emoji, username);
    message.updatedAt = new Date();
    await message.save();

    return serializeMessage(message);
  }

  const message = findMemoryMessage(roomId, messageId);
  if (!message || message.deletedAt) {
    return null;
  }

  message.reactions = toggleReactionGroups(message.reactions, emoji, username);
  message.updatedAt = new Date();

  return serializeMessage(message);
}

function markReceipt(message, username, seenAt) {
  message.readBy = message.readBy || [];

  if (message.sender === username || message.readBy.some((receipt) => receipt.username === username)) {
    return false;
  }

  message.readBy.push({ username, seenAt });
  return true;
}

export async function markMessagesSeen({ roomId, messageIds, username }) {
  const uniqueIds = [...new Set(messageIds || [])].slice(0, seenBatchLimit);
  const seenAt = new Date();

  if (uniqueIds.length === 0) {
    return [];
  }

  if (isMongoReady()) {
    const messages = await Message.find({
      roomId,
      messageId: { $in: uniqueIds },
      deletedAt: null
    });

    const updated = [];

    for (const message of messages) {
      if (markReceipt(message, username, seenAt)) {
        message.updatedAt = seenAt;
        await message.save();
        updated.push(serializeMessage(message));
      }
    }

    return updated;
  }

  cleanupMemoryRoom(roomId);
  const messages = memoryMessages.get(roomId) || [];
  const updated = [];

  messages.forEach((message) => {
    if (uniqueIds.includes(message.messageId) && !message.deletedAt && markReceipt(message, username, seenAt)) {
      message.updatedAt = seenAt;
      updated.push(serializeMessage(message));
    }
  });

  return updated;
}

export async function deleteRoom(roomId) {
  if (isMongoReady()) {
    await Promise.all([
      Room.deleteOne({ roomId }),
      Message.deleteMany({ roomId }),
      deleteRoomUploads(roomId)
    ]);
    return;
  }

  memoryRooms.delete(roomId);
  memoryMessages.delete(roomId);
  clearTimeout(memoryTimers.get(roomId));
  memoryTimers.delete(roomId);
  await deleteRoomUploads(roomId);
}
