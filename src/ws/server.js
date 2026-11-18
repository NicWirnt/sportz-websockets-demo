import { STATUS_CODES } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

const matchSubscribers = new Map();

function subscribe(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }

  matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;

  subscribers.delete(socket);

  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

function cleanupSubscriptions(socket) {
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);
  for (const subscriber of subscribers) {
    if (subscriber.readyState === WebSocket.OPEN) {
      subscriber.send(message);
    }
  }
}

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}

function rejectUpgrade(socket, status) {
  socket.write(
    `HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\n` +
      "Connection: close\r\nContent-Length: 0\r\n\r\n",
  );
  socket.destroySoon();
}

function broadcastToAll(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
}

function handleMessage(socket, data) {
  let message;
  try {
    message = JSON.parse(data.toString());
  } catch (e) {
    sendJson(socket, {
      type: "error",
      message: "Invalid JSON",
    });
    return;
  }

  if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, {
      type: "subscribed",
      matchId: message.matchId,
    });
  }
  if (message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
    unsubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, {
      type: "unsubscribed",
      matchId: message.matchId,
    });
  }
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
    socket.subscriptions = new Set();

    sendJson(socket, {
      type: "welcome",
    });
    socket.on("message", (data) => handleMessage(socket, data));
    socket.on("error", () => {
      socket.terminate();
    });

    socket.on("close", () => {
      cleanupSubscriptions(socket);
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
    broadcastToAll(wss, {
      type: "match_created",
      data: match,
    });
  }

  function broadcastCommentary(matchId, comment) {
    broadcastToMatch(matchId, {
      type: "commentary",
      data: comment,
    });
  }

  return {
    broadcastMatchCreated,
    broadcastCommentary,
  };
}
