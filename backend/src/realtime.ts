import { createServer, type Server, type RequestListener } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import OpenAI, { toFile } from "openai";
import { config } from "./config.js";
import { verifyAccessToken } from "./auth.js";

type ClientEvent = { type: "audio:start"; accessToken?: string } | { type: "audio:stop" };
type Notification = { type: string; [key: string]: unknown };
const clients = new Map<string, Set<WebSocket>>();

function publish(userId: string, event: Notification) {
  const payload = JSON.stringify(event);
  clients.get(userId)?.forEach(socket => { if (socket.readyState === WebSocket.OPEN) socket.send(payload); });
}

export function createRealtimeServer(app: RequestListener): Server {
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });
  const openai = config.openAiApiKey ? new OpenAI({ apiKey: config.openAiApiKey }) : undefined;

  wss.on("connection", socket => {
    let userId: string | undefined;
    let chunks: Buffer[] = [];
    let chunkCount = 0;
    let pending = Promise.resolve();
    const flush = () => {
      if (!userId || !openai || !chunks.length) return;
      const audio = Buffer.concat(chunks); chunks = []; chunkCount = 0;
      pending = pending.then(async () => {
        const result = await openai.audio.transcriptions.create({ file: await toFile(audio, "microphone.webm", { type: "audio/webm" }), model: "whisper-1" });
        if (result.text.trim()) publish(userId!, { type: "transcript:final", text: result.text, receivedAt: new Date().toISOString() });
      }).catch(() => publish(userId!, { type: "transcript:error", message: "Transcription failed" }));
    };

    socket.on("message", async (data, isBinary) => {
      if (!isBinary) {
        let event: ClientEvent;
        try { event = JSON.parse(data.toString()) as ClientEvent; } catch { socket.close(1008, "Invalid event"); return; }
        if (event.type === "audio:start") {
          if (!event.accessToken) { socket.close(1008, "Authentication required"); return; }
          try {
            const claims = await verifyAccessToken(event.accessToken);
            if (!claims.sub) throw new Error("Missing subject");
            userId = claims.sub; const userClients = clients.get(userId) ?? new Set<WebSocket>(); userClients.add(socket); clients.set(userId, userClients);
            socket.send(JSON.stringify({ type: "audio:ready" }));
          } catch { socket.close(1008, "Invalid access token"); }
        }
        if (event.type === "audio:stop") flush();
        return;
      }
      if (!userId) { socket.close(1008, "Authenticate before streaming audio"); return; }
      chunks.push(Buffer.from(data as ArrayBuffer));
      if (++chunkCount >= 8) flush();
    });
    socket.on("close", () => { flush(); if (userId) clients.get(userId)?.delete(socket); });
  });
  return server;
}

export { publish };
