import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import fs from "fs";

import { corsMiddleware } from "./config/cors.js";
import { env } from "./config/env.js";
import routes from "./routes/index.routes.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";

const app = express();

if (String(env.TRUST_PROXY || "0") === "1") {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(corsMiddleware());
app.options("*", corsMiddleware());

// uploads static
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const prescriptionsDir = path.resolve(env.UPLOAD_DIR, "prescriptions");
if (!fs.existsSync(prescriptionsDir)) fs.mkdirSync(prescriptionsDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));

app.use(routes);

app.use(notFound);
app.use(errorHandler);

export default app;
