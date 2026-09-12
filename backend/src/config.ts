import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  auth0Domain: required("AUTH0_DOMAIN"),
  auth0Audience: required("AUTH0_AUDIENCE"),
  auth0Issuer: required("AUTH0_ISSUER_BASE_URL"),
  tokenEncryptionKey: required("TOKEN_ENCRYPTION_KEY"),
  extensionOrigin: process.env.EXTENSION_ORIGIN,
  openAiApiKey: process.env.OPENAI_API_KEY,
  googleClientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  googleCalendarWebhookToken: process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN,
  publicBaseUrl: process.env.PUBLIC_BASE_URL
};
