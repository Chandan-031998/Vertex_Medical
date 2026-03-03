import cors from "cors";
import { env } from "./env.js";

function isLocalDevOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin || "");
}

export function corsMiddleware() {
  const allowed = (env.CORS_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  return cors({
    origin(origin, cb) {
      // Allow non-browser tools (no origin) and explicitly allowed origins
      if (!origin) return cb(null, true);
      if (isLocalDevOrigin(origin)) return cb(null, true);
      if (allowed.length === 0) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization","X-Branch-Id"],
    exposedHeaders: ["Content-Disposition"],
  });
}
