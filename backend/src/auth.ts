import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { config } from "./config.js";

export type AuthenticatedRequest = Request & { auth?: JWTPayload };

const jwks = config.auth0Domain ? createRemoteJWKSet(new URL(`https://${config.auth0Domain}/.well-known/jwks.json`)) : undefined;
const demoClaims: JWTPayload = { sub: "local-demo-user", email: "local-demo@coworker.test" };

export async function verifyAccessToken(token: string) {
  if (config.localDemoMode && token === "local-demo-token") return demoClaims;
  if (!jwks || !config.auth0Issuer || !config.auth0Audience) throw new Error("Authentication is not configured");
  const { payload } = await jwtVerify(token, jwks, { issuer: config.auth0Issuer, audience: config.auth0Audience });
  return payload;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (config.localDemoMode) { req.auth = demoClaims; return next(); }
  const token = req.header("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: "missing_bearer_token" });
  try {
    req.auth = await verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "invalid_access_token" });
  }
}

export interface GoogleDelegation {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
}

type EncryptedValue = { iv: string; tag: string; ciphertext: string };
const records = new Map<string, EncryptedValue>();
const key = Buffer.from(config.tokenEncryptionKey, "hex");
if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)");

function encrypt(value: GoogleDelegation): EncryptedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
}

function decrypt(value: EncryptedValue): GoogleDelegation {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8"));
}

export const googleTokenStore = {
  save(userId: string, delegation: GoogleDelegation) { records.set(userId, encrypt(delegation)); },
  get(userId: string) { const value = records.get(userId); return value ? decrypt(value) : undefined; },
  remove(userId: string) { records.delete(userId); }
};
