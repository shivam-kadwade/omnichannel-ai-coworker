const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
if (!domain || !clientId || !audience) throw new Error("Missing Auth0 extension environment variables");

type TokenResponse = { access_token: string; id_token?: string; expires_in: number };
const tokenKey = "auth0Tokens";

function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(value: string) {
  return encode(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

function random() { return encode(crypto.getRandomValues(new Uint8Array(32))); }

export async function getUser() {
  const { [tokenKey]: tokens } = await browser.storage.local.get(tokenKey) as { [tokenKey]?: TokenResponse };
  if (!tokens?.id_token) return undefined;
  const payload = tokens.id_token.split(".")[1];
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)))) as { email?: string };
}

export async function getAccessToken() {
  const { [tokenKey]: tokens } = await browser.storage.local.get(tokenKey) as { [tokenKey]?: TokenResponse };
  return tokens?.access_token;
}

export async function login() {
  const redirectUri = browser.identity.getRedirectURL();
  const state = random();
  const verifier = random();
  const authorize = new URL(`https://${domain}/authorize`);
  authorize.search = new URLSearchParams({
    response_type: "code", client_id: clientId, redirect_uri: redirectUri, audience,
    scope: "openid profile email offline_access", state, code_challenge: await sha256(verifier), code_challenge_method: "S256"
  }).toString();
  const callback = await browser.identity.launchWebAuthFlow({ url: authorize.toString(), interactive: true });
  if (!callback) throw new Error("Authentication was cancelled");
  const params = new URL(callback).searchParams;
  if (params.get("state") !== state || !params.get("code")) throw new Error(params.get("error_description") ?? "Authentication failed");
  const response = await fetch(`https://${domain}/oauth/token`, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, code: params.get("code")!, redirect_uri: redirectUri, code_verifier: verifier })
  });
  if (!response.ok) throw new Error("Auth0 token exchange failed");
  const tokens = await response.json() as TokenResponse;
  await browser.storage.local.set({ [tokenKey]: tokens });
  return tokens.access_token;
}
