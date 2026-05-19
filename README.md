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

## App Conversion

TempTalk is configured as a PWA, so Android users can open the deployed site in Chrome and use
**Install app** or **Add to Home screen**. This keeps the same React/Vite frontend and Node/Express
backend. For a Play Store APK/AAB later, wrap the same `client/` app with Capacitor.

The home UI also has a **Download APK** button. By default it downloads:

```txt
https://github.com/mahendra0011/TempTalk/releases/download/apk-latest/TempTalk.apk
```

The GitHub Actions workflow at `.github/workflows/android-apk.yml` builds a Capacitor Android APK and
uploads it to that release whenever client code is pushed to `master`. Set repository variable or secret
`VITE_API_URL` before building the APK if your Render API URL is different from
`https://temptalk-api.onrender.com`.

Installed Android users can open invite links directly in the TempTalk APK. The workflow injects Android
App Link intent filters into the APK, reads the APK signing SHA256 fingerprint after every build, and commits
`client/public/.well-known/assetlinks.json` so your public client domain can verify ownership. After a new APK
build, let the follow-up `assetlinks.json` commit deploy to Render before testing automatic app opening.

## Environment

Copy `server/.env.example` to `server/.env`.

MongoDB is optional for local testing. If `MONGODB_URI` is missing, the server uses in-memory temporary rooms and messages.

For Render deployment, set `MONGODB_URI`. Without MongoDB, rooms live only in server memory and invite links can stop working after a Render restart or free-service spin down.

## Included Features

- Installable Android/browser app experience through PWA manifest and service worker
- Private one-to-one temporary rooms
- Secret group rooms with a required room key
- Custom room IDs and secret keys for create room, create group, and enter room flows
- Real-time messages, typing, online status, and QR invite
- Invite links unlock the room automatically, so guests only enter an anonymous name
- Android invite links try to open the installed TempTalk app before falling back to the website
- Browser-side encryption for message text using the room secret or invite key
- Replies, reactions, edit message, delete message
- Sent and seen receipts
- Photo, video, audio, and PDF attachments
- Screenshot/copy/print privacy guards
- End Chat destroys the room and deletes its messages
- Privacy Policy page at `/privacy`

## Privacy Notes

Message text is encrypted in the browser using a key unlocked from the room secret. Invite links include secret access
inside the URL fragment, such as `#key=...&secret=...`, so guests can join by entering only an anonymous name. The
fragment is not sent to the API during normal HTTP requests, so the backend stores encrypted message text.

Pressing End Chat immediately hard-deletes the room record, message records/chats, reactions, receipts, and uploaded files from TempTalk server storage.
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
VITE_APK_URL=https://your-host/TempTalk.apk
VITE_PUBLIC_CLIENT_URL=https://your-client.onrender.com
VITE_APP_LINK_HOSTS=temptalk-client.onrender.com
```

For APK builds, set `ANDROID_APP_LINK_HOSTS` in GitHub Actions if your public client domain is different.
Each listed host must serve the deployed frontend, including `/.well-known/assetlinks.json`, for Android
to open HTTPS invite links in the installed app automatically.

In Render dashboard, add this static-site rewrite if you are not using `render.yaml`:

```txt
Source: /*
Destination: /index.html
Action: Rewrite
```

If Render fails during dependency install with `npm ERR! network read ECONNRESET`, rerun the deploy. That error is a
temporary npm registry/network drop, not a TempTalk build error. The blueprint uses `npm ci` and local `.npmrc` retry
settings to make installs more reliable.
