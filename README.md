# TempTalk

Temporary anonymous chat built with React, Vite, Express, Socket.IO, and optional MongoDB TTL deletion.

## Run Locally

```bash
npm install
npm run install:all
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000`

## Environment

Copy `server/.env.example` to `server/.env`.

MongoDB is optional for local testing. If `MONGODB_URI` is missing, the server uses in-memory temporary rooms and messages.

For Render deployment, set `MONGODB_URI`. Without MongoDB, rooms live only in server memory and invite links can stop working after a Render restart or free-service spin down.

## Included Features

- Private one-to-one temporary rooms
- Secret group rooms with a required room key
- Real-time messages, typing, online status, and QR invite
- Browser-side end-to-end encryption for message text in new invite links
- Replies, reactions, edit message, delete message
- Sent and seen receipts
- Photo, video, audio, and PDF attachments
- Screenshot/copy/print privacy guards
- End Chat destroys the room and deletes its messages
- Privacy Policy page at `/privacy`

## Privacy Notes

New rooms generate a browser-only encryption key and place it in the invite URL fragment as `#key=...`.
The fragment is not sent to the API during normal HTTP requests, so the backend stores encrypted message text.

Pressing End Chat deletes the room, message records, reactions, receipts, and uploaded files from TempTalk server storage.
MongoDB TTL cleanup also removes expired rooms and messages. TempTalk cannot erase content another participant already copied,
downloaded, recorded, screenshotted, or saved outside the app. In this version, uploaded media files are temporary and deleted
with the room, but only message text is end-to-end encrypted.

## Render Notes

This repo includes `render.yaml` with:

- `temptalk-api` Node web service from `server/`
- `temptalk-client` static site from `client/`
- SPA rewrite from `/*` to `/index.html` so invite links like `/chat/abc123` open correctly

Important env vars:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
CLIENT_URL=https://your-client.onrender.com
PUBLIC_CLIENT_URL=https://your-client.onrender.com
CORS_ORIGIN=https://your-client.onrender.com
VITE_API_URL=https://your-api.onrender.com
VITE_MAX_ATTACHMENT_MB=50
```

In Render dashboard, add this static-site rewrite if you are not using `render.yaml`:

```txt
Source: /*
Destination: /index.html
Action: Rewrite
```
