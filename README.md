# GhostChat

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
- Replies, reactions, edit message, delete message
- Sent and seen receipts
- Photo, video, audio, and PDF attachments
- Screenshot/copy/print privacy guards
- End Chat destroys the room and deletes its messages

## Render Notes

This repo includes `render.yaml` with:

- `ghostchat-api` Node web service from `server/`
- `ghostchat-client` static site from `client/`
- SPA rewrite from `/*` to `/index.html` so invite links like `/chat/abc123` open correctly

Important env vars:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
CLIENT_URL=https://your-client.onrender.com
PUBLIC_CLIENT_URL=https://your-client.onrender.com
CORS_ORIGIN=https://your-client.onrender.com
VITE_API_URL=https://your-api.onrender.com
```
