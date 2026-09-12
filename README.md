# Omnichannel AI Coworker

Firefox extension and Node.js orchestration backend for the AI Tinkerers hackathon.

## Phase 1: local setup

1. Copy `backend/.env.example` to `backend/.env` and `extension/.env.example` to `extension/.env`.
2. Create an Auth0 **Single Page Application** for the extension and an **API** with audience `https://api.omnichannel-coworker.local`.
3. In Auth0, allow the Firefox extension redirect URI shown in the extension popup after it is loaded temporarily. Also configure the API identifier as the SPA's audience.
4. `npm install && npm run dev:backend` and, separately, `npm run dev:extension`.

Auth0 access tokens are verified against the tenant JWKS in the backend. Delegated Google refresh tokens are encrypted at rest with `TOKEN_ENCRYPTION_KEY`; use a 32-byte key encoded as 64 hex characters.

> The current token store is an in-memory implementation to make the authentication boundary explicit. Replace it with a durable encrypted datastore before deployment.

## Local demo without Auth0

For a private localhost demo, set `LOCAL_DEMO_MODE=true` in `backend/.env` and `VITE_LOCAL_DEMO_MODE=true` in `extension/.env`. Do not expose this mode through a public URL: it accepts a fixed local demo identity. Set `OPENROUTER_API_KEY` (with `OPENROUTER_MODEL=openrouter/free` for a low-volume free demo) or `OPENAI_API_KEY` to enable sidebar chat. Microphone transcription specifically uses OpenAI Whisper and therefore requires `OPENAI_API_KEY`. Run `npm run dev:backend` and `npm run dev:extension`, then load the generated `extension/dist` directory temporarily in Firefox.

## Browser builds

Build all browser packages with `npm run build:all --workspace @coworker/extension`. The output directories are `extension/dist/firefox`, `extension/dist/chrome`, `extension/dist/edge`, and `extension/dist/safari`.

- Firefox: load `extension/dist/firefox/manifest.json` temporarily from `about:debugging`.
- Chrome: load the unpacked `extension/dist/chrome` folder at `chrome://extensions` with Developer mode enabled.
- Edge: load the unpacked `extension/dist/edge` folder at `edge://extensions` with Developer mode enabled.
- Safari: package `extension/dist/safari` on macOS using `xcrun safari-web-extension-packager extension/dist/safari --project-location ./SafariCoworker --app-name "AI Coworker" --bundle-identifier "com.shivamkadwade.aicoworker"`, then open and run the generated Xcode project. Safari installs Web Extensions through its containing app rather than from a raw manifest.
