import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createCorsOptions } from "./config/cors.js";
import roomRoutes from "./routes/roomRoutes.js";
import { getUploadRoot } from "./services/fileStore.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

app.use(cors(createCorsOptions()));
app.use(express.json({ limit: "64kb" }));
app.use(
  "/uploads",
  express.static(getUploadRoot(), {
    setHeaders(res) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
    }
  })
);

app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      res.status(429).json({ message: "Too many requests." });
    }
  })
);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "temptalk-xwes",
    time: new Date().toISOString()
  });
});

app.use("/api/rooms", roomRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((error, req, res, next) => {
  if (isProduction && error.stack) {
    console.error(`${error.name}: ${error.message}`);
  } else {
    console.error(error);
  }
  const status = error.status || 500;
  res.status(status).json({
    message: status === 500 && isProduction ? "Internal server error." : error.message || "Error."
  });
});

export default app;
