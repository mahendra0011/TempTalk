import { nanoid } from "nanoid";
import { isMongoReady } from "../config/db.js";
import Message from "../models/Message.js";
import Room from "../models/Room.js";

const memoryRooms = new Map();
const memoryMessages = new Map();
const memoryTimers = new Map();

const roomTtlMinutes = Number(process.env.ROOM_TTL_MINUTES || 60);
const messageTtlMinutes = Number(process.env.MESSAGE_TTL_MINUTES || roomTtlMinutes);
const roomTtlMs = Math.max(roomTtlMinutes, 1) * 60 * 1000;
const messageTtlMs = Math.max(messageTtlMinutes, 1) * 60 * 1000;

function dateAfter(ms) {
  return new Date(Date.now() + ms);
}

function serializeDoc(doc) {
  if (!doc) {
    return null;
  }

  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    ...plain,
    _id: undefined,
    __v: undefined,
    expiresAt: plain.expiresAt?.toISOString?.() ?? plain.expiresAt,
    createdAt: plain.createdAt?.toISOString?.() ?? plain.createdAt,
    updatedAt: plain.updatedAt?.toISOString?.() ?? plain.updatedAt
  };
}

function isExpired(record) {
  return !record || new Date(record.expiresAt).getTime() <= Date.now();
}

function scheduleMemoryDeletion(roomId, expiresAt) {
  clearTimeout(memoryTimers.get(roomId));

  const delay = Math.max(new Date(expiresAt).getTime() - Date.now(), 0);
  const timer = setTimeout(() => {
    memoryRooms.delete(roomId);
    memoryMessages.delete(roomId);
    memoryTimers.delete(roomId);
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

export async function createRoom() {
  let roomId = nanoid(6);

  while (await roomExists(roomId)) {
    roomId = nanoid(6);
  }

  const room = {
    roomId,
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

export async function getRoom(roomId) {
  if (isMongoReady()) {
    const room = await Room.findOne({
      roomId,
      active: true,
      expiresAt: { $gt: new Date() }
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

export async function createMessage({ roomId, sender, text }) {
  const message = {
    messageId: nanoid(12),
    roomId,
    sender,
    text,
    expiresAt: dateAfter(messageTtlMs),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (isMongoReady()) {
    const created = await Message.create(message);
    return serializeDoc(created);
  }

  cleanupMemoryRoom(roomId);
  const messages = memoryMessages.get(roomId) || [];
  messages.push(message);
  memoryMessages.set(roomId, messages);

  return serializeDoc(message);
}

export async function getMessages(roomId) {
  if (isMongoReady()) {
    const messages = await Message.find({
      roomId,
      expiresAt: { $gt: new Date() }
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    return messages.map(serializeDoc);
  }

  cleanupMemoryRoom(roomId);
  return (memoryMessages.get(roomId) || []).map(serializeDoc);
}

export async function deleteRoom(roomId) {
  if (isMongoReady()) {
    await Promise.all([
      Room.deleteOne({ roomId }),
      Message.deleteMany({ roomId })
    ]);
    return;
  }

  memoryRooms.delete(roomId);
  memoryMessages.delete(roomId);
  clearTimeout(memoryTimers.get(roomId));
  memoryTimers.delete(roomId);
}
