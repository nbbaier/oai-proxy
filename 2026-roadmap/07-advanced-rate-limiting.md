# Advanced Rate Limiting

**Category:** Security / Stability
**Quarter:** Q2
**T-shirt Size:** M

## Why This Matters

Daily token limits are a blunt instrument. A malicious or buggy script can burn through a daily quota in 5 minutes, leaving the user blocked for the next 23 hours.

We need "Leaky Bucket" or "Token Bucket" rate limiting to smooth out traffic (e.g., "100 requests per minute") and prevent spikes.

## Current State

- Daily hard caps only.

## Proposed Future State

- **Granular Limits:** Define RPM (Requests Per Minute) and TPM (Tokens Per Minute) limits.
- **Per-Endpoint Limits:** "Only 10 calls to GPT-4 per minute, but unlimited GPT-3.5".
- **Headers:** Return `X-RateLimit-Remaining` headers standard.

## Key Deliverables

- [ ] Rate limit algorithm implementation (Redis-backed or in-memory map).
- [ ] Configuration UI for limits per consumer/tier.
- [ ] 429 Error handling with `Retry-After`.

## Prerequisites

- **02-multi-tenant-auth** (limits need to apply to a consumer).

## Risks & Open Questions

- **Distributed State:** If running multiple replicas, in-memory rate limiting won't work perfectly. Redis is needed for strict enforcement.

## Notes

This is critical for exposing the proxy to untrusted clients.
