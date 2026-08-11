# Security Policy

Lattice takes on-chain data security and bot reliability seriously. This document outlines our disclosure process and key attack surfaces.

---

## Scope

### In Scope
- Lattice backend API endpoints (`/backend`)
- Telegram & Twitter Bot webhook verification handlers
- Token audit data sanitization and GMGN API key secret handling

### Out of Scope
- Third-party blockchain RPC nodes (e.g. Helius, Solscan, Alchemy)
- Official GMGN API infrastructure external to Lattice

---

## Reporting a Vulnerability

If you discover a security vulnerability, please do **NOT** open a public issue or discuss it in public chat groups.

Email your report to: **security@lattice.audit** (or open a private security advisory on GitHub).

### What to include in your report:
- Clear description of the vulnerability and potential impact.
- Step-by-step reproduction steps or Proof of Concept (PoC).
- Any proposed remediation if available.

### Response Timeline
- **Acknowledgement:** Within 48 hours.
- **Triage & Assessment:** Within 5 business days.
- **Fix & Patch Deployment:** Critical vulnerabilities within 7 days.

---

## Key Attack Surfaces & Safeguards

1. **API Key Security:** GMGN, Telegram, and X API keys are strictly kept in environment variables and never logged or exposed to client responses.
2. **Input Sanitization:** Contract addresses (CAs) received via X mentions or Telegram messages are validated against chain format regex (e.g. Solana Base58 string check) before issuing RPC / API calls.
3. **Webhook Verification:** Telegram and X webhook endpoints enforce secret token headers to prevent forged payload execution.
4. **Rate Limiting:** Request rate limiting prevents API abuse and denial-of-service attempts.
