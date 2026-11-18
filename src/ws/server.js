import { STATUS_CODES } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
}

function rejectUpgrade(socket, status) {
  socket.write(
    `HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\n` +
      "Connection: close\r\nContent-Length: 0\r\n\r\n",
  );
  socket.destroySoon();
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    noServer: true,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  server.on("upgrade", async (req, socket, head) => {
    const onSocketError = () => socket.destroy();
    socket.once("error", onSocketError);

    try {
      if (!wss.shouldHandle(req)) {
        rejectUpgrade(socket, 400);
        return;
      }

      if (wsArcjet) {
        const decision = await wsArcjet.protect(req);
        if (socket.destroyed) return;

        if (decision.isDenied()) {
          rejectUpgrade(socket, decision.reason.isRateLimit() ? 429 : 403);
          return;
        }
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        socket.removeListener("error", onSocketError);
        wss.emit("connection", ws, req);
      });
    } catch (err) {
      console.error("WS upgrade error", err);
      socket.destroy();
    }
  });

  wss.on("connection", (socket) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });
    sendJson(socket, {
      type: "welcome",
    });
    socket.on("error", console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  function broadcastMatchCreated(match) {
    broadcast(wss, {
      type: "match_created",
      data: match,
    });
  }
  return {
    broadcastMatchCreated,
  };
}
