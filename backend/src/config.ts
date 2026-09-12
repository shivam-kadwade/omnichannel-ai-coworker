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
  extensionOrigin: process.env.EXTENSION_ORIGIN
};
