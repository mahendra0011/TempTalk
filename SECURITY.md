# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in TempTalk, please report it responsibly by emailing security@temptalk.app or through GitHub's private security reporting feature. Do not create a public issue for security vulnerabilities.

## Security Measures

TempTalk implements the following security measures:
- End-to-end encryption for all messages and attachments
- No plaintext sensitive data stored on servers
- Automatic room/message expiration via TTL
- Rate limiting on all endpoints
- Minimal logging (no IP addresses stored)

## Scope

The following are considered out of scope for our security model:
- Client-side screenshot/copy actions (browser-dependent)
- Network-level metadata (message timing, room join patterns)
- Device fingerprints or browser fingerprints