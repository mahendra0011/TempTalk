import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createCorsOptions } from "./config/cors.js";
import roomRoutes from "./routes/roomRoutes.js";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(cors(createCorsOptions()));
app.use(express.json({ limit: "64kb" }));

app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false
  })
);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "ghostchat-api",
    time: new Date().toISOString()
  });
});

app.use("/api/rooms", roomRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Internal server error."
  });
});

export default app;
