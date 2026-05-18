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

## Included Features

- Private one-to-one temporary rooms
- Secret group rooms with a required room key
- Real-time messages, typing, online status, and QR invite
- Replies, reactions, edit message, delete message
- Sent and seen receipts
- Photo, video, audio, and PDF attachments
- Screenshot/copy/print privacy guards
- End Chat destroys the room and deletes its messages
