# Multi-Tenant Identity & Auth

**Category:** Security / Architecture
**Quarter:** Q1
**T-shirt Size:** L

## Why This Matters

Currently, the proxy acts as a single gatekeeper for one "global" user. If you share the proxy URL, anyone can use your quota. There is no way to issue keys to different team members or applications to track who is using what.

This initiative turns the project from a "personal utility" into a "team platform," enabling per-user tracking, accountability, and secure access.

## Current State

- No inbound authentication.
- Single outbound `OPENAI_API_KEY`.
- Usage is tracked only by "Premium" vs "Mini" tiers globally.

## Proposed Future State

- **Consumers & Keys:** Create `consumers` (users/apps) and issue `api_keys` for them.
- **Per-Consumer Tracking:** The dashboard shows usage split by consumer.
- **Scoped Limits:** "Alice has 100k daily tokens," "Bob has 500k."
- **Auth Middleware:** The proxy validates `Authorization: Bearer sk-proxy-...` before forwarding.

## Key Deliverables

- [ ] New DB tables: `consumers`, `api_keys`.
- [ ] Migration to associate `usage_records` and `request_history` with `consumer_id`.
- [ ] Middleware to validate incoming keys.
- [ ] UI for generating and revoking keys.

## Prerequisites

- **03-database-agnosticism** is recommended but not strictly required (can be done in SQLite first).

## Risks & Open Questions

- **Migration:** How to handle existing history that has no consumer ID? (Assign to a "default" admin consumer).
- **Key Format:** Should we use `sk-proxy-...` to distinguish from OpenAI keys?

## Notes

This unlocks the ability to use this proxy as an internal "LLM Gateway" for a company.
