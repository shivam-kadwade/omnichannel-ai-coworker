import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { googleTokenStore, requireAuth, type AuthenticatedRequest, type GoogleDelegation } from "./auth.js";
import { receiveCalendarWebhook, startCalendarWatch } from "./calendar.js";
import { createRealtimeServer } from "./realtime.js";
import { confirmFollowUpSend, respondToAgent } from "./agent.js";

const app = express();
app.use(cors({ origin: config.extensionOrigin ?? false }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.put("/v1/integrations/google", requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth?.sub;
  if (!userId) return res.status(401).json({ error: "missing_subject" });
  const delegation = req.body as GoogleDelegation;
  if (!delegation.accessToken || !delegation.refreshToken || !delegation.expiresAt || !Array.isArray(delegation.scopes)) {
    return res.status(400).json({ error: "invalid_google_delegation" });
  }
  googleTokenStore.save(userId, delegation);
  return res.status(204).end();
});

app.delete("/v1/integrations/google", requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.auth?.sub) googleTokenStore.remove(req.auth.sub);
  res.status(204).end();
});
app.post("/v1/webhooks/google-calendar", receiveCalendarWebhook);
app.post("/v1/integrations/google/calendar/watch", requireAuth, startCalendarWatch);
app.post("/v1/agent/respond", requireAuth, respondToAgent);
app.post("/v1/agent/confirm-send", requireAuth, confirmFollowUpSend);

createRealtimeServer(app).listen(config.port, () => console.log(`Backend listening on :${config.port}`));
