# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in TempTalk, please report it responsibly by emailing security@temptalk.app or through GitHub's private security reporting feature. Do not create a public issue for security vulnerabilities.

## Security Measures Implemented

TempTalk implements the following security measures:

### End-to-End Encryption
- All messages are encrypted in-browser using AES-256-GCM before transmission
- Room keys are derived using SHA-256 or PBKDF2 (100,000 iterations)
- Encryption keys are never sent to the server - they remain in URL fragments (` #key=...`)
- Attachment files are encrypted in-browser before upload
- **Attachment metadata (filename, MIME type) is encrypted** - server only sees encrypted binary and file size

### Data Protection
- No plaintext sensitive data stored on servers (no IP addresses, no original filenames)
- Room secrets are stored as SHA-256 hashes, never in plaintext
- Automatic room/message expiration via MongoDB TTL indexes (60-second granularity)
- Files are automatically deleted when rooms are ended

### Network Security
- Rate limiting on all Socket.IO events (10 requests per second per socket)
- Rate limiting on REST endpoints (120 requests per minute)
- Helmet.js security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- CORS restricted to configured origins
- WSS (WebSocket Secure) in production

### Session Security
- Socket.IO rooms require valid room access before joining
- Server-side validation of all room operations
- No sensitive data in logs

## Security Measures Planned / Out of Scope

### In Scope for Future Implementation
- Enhanced connection reconnection handling
- Additional input validation on Socket.IO events

### Out of Scope
- Client-side screenshot/copy actions (browser-dependent)
- Network-level metadata (message timing, room join patterns)
- Device fingerprints or browser fingerprints

## Configuration Notes

### MongoDB Setup
For persistent storage, configure `MONGODB_URI` in Render dashboard environment variables. Without it, rooms use in-memory storage which is lost on server restart (default Render free tier behavior).

### Environment Variables
- `CORS_ORIGIN` - Restrict in production, avoid wildcard `*`
- `MONGODB_URI` - MongoDB Atlas connection string
- `ROOM_TTL_MINUTES` - Default 1440 (24 hours)
- `MAX_ATTACHMENT_MB` - Default 50MB

## Security Checklist

- [x] Helmet security headers
- [x] Rate limiting (REST and Socket.IO)
- [x] Input validation with Zod
- [x] Attachment encryption
- [x] Metadata encryption
- [x] MongoDB TTL indexes
- [x] No sensitive logs
- [x] Secure key handling (URL fragment only)