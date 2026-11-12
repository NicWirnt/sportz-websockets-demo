import express from "express";
import http from "http";
import { matchRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "0.0.0.0";

// parse JSON request bodies
app.use(express.json());
const server = http.createServer(app);

// root route
app.get("/", (req, res) => {
  res.json({ message: "Hello from Express on port 8000!" });
});

app.use("/matches", matchRouter);

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

// start server
server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server running at ${baseUrl}/`);
  console.log(
    `WebSocket server running at ${baseUrl.replace("http", "ws")}/ws`,
  );
});
