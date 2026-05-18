import {
  addUserToRoom,
  createMessage,
  deleteRoom,
  getMessages,
  getRoom,
  removeUserFromRoom
} from "../services/chatStore.js";
import { sanitizeRoomId, sanitizeText, sanitizeUsername } from "../utils/sanitize.js";

const roomPresence = new Map();
const maxPeers = Number(process.env.MAX_ROOM_PEERS || 2);
const aliases = ["Cipher", "Vanta", "Nova", "Ghost", "Zero", "Pulse", "Echo", "Shade"];

function getPresence(roomId) {
  if (!roomPresence.has(roomId)) {
    roomPresence.set(roomId, new Map());
  }

  return roomPresence.get(roomId);
}

function publicPresence(roomId) {
  return [...getPresence(roomId).values()].map((user) => ({
    id: user.socketId,
    username: user.username,
    joinedAt: user.joinedAt
  }));
}

function randomAlias() {
  const alias = aliases[Math.floor(Math.random() * aliases.length)];
  return `${alias}-${Math.floor(100 + Math.random() * 900)}`;
}

function socketInRoom(socket, roomId) {
  return socket.rooms.has(roomId) && socket.data.roomId === roomId;
}

async function leaveCurrentRoom(socket, io) {
  const roomId = socket.data.roomId;
  const username = socket.data.username;

  if (!roomId) {
    return;
  }

  const users = getPresence(roomId);
  users.delete(socket.id);
  await removeUserFromRoom(roomId, socket.id);

  socket.to(roomId).emit("user-left", { username });
  io.to(roomId).emit("room-status", {
    users: publicPresence(roomId),
    onlineCount: users.size
  });

  if (users.size === 0) {
    roomPresence.delete(roomId);
  }

  socket.leave(roomId);
  socket.data.roomId = null;
}

function fail(ack, payload) {
  if (typeof ack === "function") {
    ack({ ok: false, ...payload });
  }
}

export function registerChatSocket(io) {
  io.on("connection", (socket) => {
    socket.on("join-room", async (payload, ack) => {
      try {
        const roomId = sanitizeRoomId(payload?.roomId || payload);

        if (!roomId) {
          fail(ack, { reason: "invalid-room", message: "Invalid room." });
          return;
        }

        const room = await getRoom(roomId);
        if (!room) {
          fail(ack, { reason: "missing-room", message: "Room is unavailable." });
          socket.emit("chat-ended", { roomId });
          return;
        }

        if (socket.data.roomId && socket.data.roomId !== roomId) {
          await leaveCurrentRoom(socket, io);
        }

        const users = getPresence(roomId);
        if (!users.has(socket.id) && users.size >= maxPeers) {
          fail(ack, { reason: "room-full", message: "Room is full." });
          socket.emit("room-full", { roomId });
          return;
        }

        const username = sanitizeUsername(payload?.username) || randomAlias();
        const user = {
          socketId: socket.id,
          username,
          joinedAt: new Date().toISOString()
        };

        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.username = username;
        users.set(socket.id, user);
        await addUserToRoom(roomId, user);

        const messages = await getMessages(roomId);
        const status = {
          users: publicPresence(roomId),
          onlineCount: users.size
        };

        socket.emit("room-status", status);
        socket.to(roomId).emit("user-joined", { username });
        socket.to(roomId).emit("room-status", status);

        if (typeof ack === "function") {
          ack({
            ok: true,
            room,
            username,
            users: status.users,
            messages
          });
        }
      } catch (error) {
        fail(ack, { reason: "server-error", message: error.message });
      }
    });

    socket.on("send-message", async (payload, ack) => {
      try {
        const roomId = sanitizeRoomId(payload?.roomId);
        const text = sanitizeText(payload?.text || payload?.message, 1000);

        if (!roomId || !socketInRoom(socket, roomId)) {
          fail(ack, { reason: "not-in-room" });
          return;
        }

        if (!text) {
          fail(ack, { reason: "empty-message" });
          return;
        }

        const room = await getRoom(roomId);
        if (!room) {
          socket.emit("chat-ended", { roomId });
          fail(ack, { reason: "missing-room" });
          return;
        }

        const message = await createMessage({
          roomId,
          sender: socket.data.username || randomAlias(),
          text
        });

        io.to(roomId).emit("receive-message", message);

        if (typeof ack === "function") {
          ack({ ok: true, message });
        }
      } catch (error) {
        fail(ack, { reason: "server-error", message: error.message });
      }
    });

    socket.on("typing", (payload) => {
      const roomId = sanitizeRoomId(payload?.roomId || payload);

      if (!roomId || !socketInRoom(socket, roomId)) {
        return;
      }

      socket.to(roomId).emit("show-typing", {
        username: socket.data.username,
        isTyping: Boolean(payload?.isTyping ?? true)
      });
    });

    socket.on("end-chat", async (payload, ack) => {
      try {
        const roomId = sanitizeRoomId(payload?.roomId || payload);

        if (!roomId || !socketInRoom(socket, roomId)) {
          fail(ack, { reason: "not-in-room" });
          return;
        }

        await deleteRoom(roomId);
        roomPresence.delete(roomId);

        io.to(roomId).emit("chat-ended", {
          roomId,
          endedBy: socket.data.username
        });

        const sockets = await io.in(roomId).fetchSockets();
        sockets.forEach((roomSocket) => {
          roomSocket.leave(roomId);
          roomSocket.data.roomId = null;
        });

        if (typeof ack === "function") {
          ack({ ok: true });
        }
      } catch (error) {
        fail(ack, { reason: "server-error", message: error.message });
      }
    });

    socket.on("disconnect", async () => {
      await leaveCurrentRoom(socket, io);
    });
  });
}
