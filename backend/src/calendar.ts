import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { google } from "googleapis";
import { config } from "./config.js";
import { googleTokenStore, type AuthenticatedRequest } from "./auth.js";
import { publish } from "./realtime.js";

function signedUserId(userId: string) {
  if (!config.googleCalendarWebhookToken) throw new Error("GOOGLE_CALENDAR_WEBHOOK_TOKEN is not configured");
  const signature = createHmac("sha256", config.googleCalendarWebhookToken).update(userId).digest("base64url");
  return `${userId}.${signature}`;
}
function verifySignedUserId(value: string | undefined) {
  if (!value || !config.googleCalendarWebhookToken) return undefined;
  const separator = value.lastIndexOf("."); if (separator < 1) return undefined;
  const userId = value.slice(0, separator); const expected = signedUserId(userId).slice(separator + 1);
  const actual = value.slice(separator + 1);
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected)) ? userId : undefined;
}

export function calendarWebhookTokenFor(userId: string) { return signedUserId(userId); }

export async function startCalendarWatch(req: AuthenticatedRequest, res: Response) {
  const userId = req.auth?.sub;
  if (!userId) return res.status(401).json({ error: "missing_subject" });
  const delegated = googleTokenStore.get(userId);
  if (!delegated || !config.googleClientId || !config.googleClientSecret || !config.publicBaseUrl) return res.status(409).json({ error: "google_calendar_not_configured" });
  const auth = new google.auth.OAuth2(config.googleClientId, config.googleClientSecret);
  auth.setCredentials({ access_token: delegated.accessToken, refresh_token: delegated.refreshToken, expiry_date: delegated.expiresAt });
  const channel = await google.calendar({ version: "v3", auth }).events.watch({
    calendarId: "primary",
    requestBody: { id: randomUUID(), type: "web_hook", address: `${config.publicBaseUrl.replace(/\/$/, "")}/v1/webhooks/google-calendar`, token: calendarWebhookTokenFor(userId) }
  });
  return res.status(201).json({ channelId: channel.data.id, resourceId: channel.data.resourceId, expiresAt: channel.data.expiration });
}

export async function receiveCalendarWebhook(req: Request, res: Response) {
  const userId = verifySignedUserId(req.header("x-goog-channel-token") ?? undefined);
  if (!userId) return res.status(401).end();
  if (req.header("x-goog-resource-state") === "sync") return res.status(204).end();
  const delegated = googleTokenStore.get(userId);
  if (!delegated || !config.googleClientId || !config.googleClientSecret) return res.status(204).end();
  const auth = new google.auth.OAuth2(config.googleClientId, config.googleClientSecret);
  auth.setCredentials({ access_token: delegated.accessToken, refresh_token: delegated.refreshToken, expiry_date: delegated.expiresAt });
  const now = new Date(); const soon = new Date(now.getTime() + 2 * 60_000);
  const calendar = google.calendar({ version: "v3", auth });
  const events = await calendar.events.list({ calendarId: "primary", timeMin: now.toISOString(), timeMax: soon.toISOString(), singleEvents: true, orderBy: "startTime" });
  for (const event of events.data.items ?? []) {
    if (event.start?.dateTime) publish(userId, { type: "meeting:starting", eventId: event.id, title: event.summary ?? "Meeting", startTime: event.start.dateTime });
  }
  return res.status(204).end();
}
