import { google } from "googleapis";
import { config } from "./config.js";
import { googleTokenStore } from "./auth.js";

function clientFor(userId: string) {
  const tokens = googleTokenStore.get(userId);
  if (!tokens || !config.googleClientId || !config.googleClientSecret) throw new Error("Google Workspace is not connected");
  const auth = new google.auth.OAuth2(config.googleClientId, config.googleClientSecret);
  auth.setCredentials({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken, expiry_date: tokens.expiresAt });
  return google.gmail({ version: "v1", auth });
}
function rawMessage(to: string[], subject: string, body: string) {
  return Buffer.from([`To: ${to.join(", ")}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n")).toString("base64url");
}
export async function createDraft(userId: string, to: string[], subject: string, body: string) {
  const draft = await clientFor(userId).users.drafts.create({ userId: "me", requestBody: { message: { raw: rawMessage(to, subject, body) } } });
  return draft.data.id;
}
export async function sendEmail(userId: string, to: string[], subject: string, body: string) {
  const message = await clientFor(userId).users.messages.send({ userId: "me", requestBody: { raw: rawMessage(to, subject, body) } });
  return message.data.id;
}
