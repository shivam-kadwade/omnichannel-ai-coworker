import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const localDemoMode = process.env.LOCAL_DEMO_MODE === "true";
const demoTokenEncryptionKey = "0000000000000000000000000000000000000000000000000000000000000000";

export const config = {
  port: Number(process.env.PORT ?? 3001),
  localDemoMode,
  auth0Domain: localDemoMode ? undefined : required("AUTH0_DOMAIN"),
  auth0Audience: localDemoMode ? undefined : required("AUTH0_AUDIENCE"),
  auth0Issuer: localDemoMode ? undefined : required("AUTH0_ISSUER_BASE_URL"),
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY ?? (localDemoMode ? demoTokenEncryptionKey : required("TOKEN_ENCRYPTION_KEY")),
  extensionOrigin: process.env.EXTENSION_ORIGIN,
  openAiApiKey: process.env.OPENAI_API_KEY,
  googleClientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  googleCalendarWebhookToken: process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN,
  publicBaseUrl: process.env.PUBLIC_BASE_URL,
  otariBaseUrl: localDemoMode ? undefined : process.env.OTARI_BASE_URL,
  otariApiKey: localDemoMode ? undefined : process.env.OTARI_API_KEY,
  otariModel: process.env.OTARI_MODEL ?? "openrouter:openai/gpt-4o-mini",
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterBaseUrl: "https://openrouter.ai/api/v1",
  openRouterModel: process.env.OPENROUTER_MODEL ?? "openrouter/free",
  localLlmBaseUrl: process.env.LOCAL_LLM_BASE_URL,
  localLlmModel: process.env.LOCAL_LLM_MODEL,
  exaApiKey: process.env.EXA_API_KEY,
  ambiguousApiKey: process.env.AMBIGUOUS_API_KEY,
  ambiguousBaseUrl: process.env.AMBIGUOUS_BASE_URL ?? "https://app.ambiguous.ai"
};
