export function getAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN || process.env.CLIENT_URL || "*";
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createCorsOptions() {
  const origins = getAllowedOrigins();

  if (origins.includes("*")) {
    return {
      origin: true,
      credentials: true
    };
  }

  return {
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true
  };
}

export function createSocketCorsOptions() {
  const origins = getAllowedOrigins();

  return {
    origin: origins.includes("*") ? "*" : origins,
    credentials: true
  };
}
