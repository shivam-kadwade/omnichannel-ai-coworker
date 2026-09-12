# Omnichannel AI Coworker

Firefox extension and Node.js orchestration backend for the AI Tinkerers hackathon.

## Phase 1: local setup

1. Copy `backend/.env.example` to `backend/.env` and `extension/.env.example` to `extension/.env`.
2. Create an Auth0 **Single Page Application** for the extension and an **API** with audience `https://api.omnichannel-coworker.local`.
3. In Auth0, allow the Firefox extension redirect URI shown in the extension popup after it is loaded temporarily. Also configure the API identifier as the SPA's audience.
4. `npm install && npm run dev:backend` and, separately, `npm run dev:extension`.

Auth0 access tokens are verified against the tenant JWKS in the backend. Delegated Google refresh tokens are encrypted at rest with `TOKEN_ENCRYPTION_KEY`; use a 32-byte key encoded as 64 hex characters.

> The current token store is an in-memory implementation to make the authentication boundary explicit. Replace it with a durable encrypted datastore before deployment.
