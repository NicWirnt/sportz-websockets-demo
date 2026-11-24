import express from "express";
import http from "http";
import { matchRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";
import { securityMiddleware } from "./arcjet.js";
import { commentaryRouter } from "./routes/commentary.js";

import { publisherOnly } from "./publisher.js";
import { pool } from "./db/db.js";
import { createDemo } from "./demo.js";

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "0.0.0.0";

// parse JSON request bodies
app.use(express.json());
const server = http.createServer(app);

// root route
app.get("/", (req, res) => {
  res.json({ message: "Sportz broadcast API" });
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1 FROM matches LIMIT 1");
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});
app.use(securityMiddleware());
const demo = createDemo(process.env.DEMO_ENABLED === "true", (state) =>
  broadcastDemo(state),
);

app.get("/demo", (_req, res) => {
  res.set("Cache-Control", "no-store").json({ data: demo.snapshot() });
});
app.post("/demo", (req, res) => {
  if (!req.is("application/json")) return res.sendStatus(415);
  if (!demo.snapshot().enabled)
    return res.status(403).json({ error: "The live demo is disabled." });
  const started = demo.start();
  res
    .set("Cache-Control", "no-store")
    .status(started ? 201 : 200)
    .json({ data: demo.snapshot() });
});

app.use(publisherOnly);
app.use("/matches", matchRouter);
app.use("/matches/:id/commentary", commentaryRouter);

const {
  broadcastMatchCreated,
  broadcastCommentary,
  broadcastScore,
  broadcastDemo,
} = attachWebSocketServer(server, demo.snapshot);
app.locals.broadcastScore = broadcastScore;
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;
// start server
server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server running at ${baseUrl}/`);
  console.log(
    `WebSocket server running at ${baseUrl.replace("http", "ws")}/ws`,
  );
});
