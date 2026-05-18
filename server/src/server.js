import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { createSocketCorsOptions } from "./config/cors.js";
import { connectDB } from "./config/db.js";
import { registerChatSocket } from "./sockets/chatSocket.js";

const port = Number(process.env.PORT || 5000);

await connectDB();

const server = http.createServer(app);
const io = new Server(server, {
  cors: createSocketCorsOptions(),
  maxHttpBufferSize: Math.max(Number(process.env.MAX_ATTACHMENT_MB || 50), 1) * 1024 * 1024,
  pingTimeout: 30000,
  pingInterval: 10000
});

registerChatSocket(io);

server.listen(port, () => {
  console.log(`TempTalk server listening on http://localhost:${port}`);
});
