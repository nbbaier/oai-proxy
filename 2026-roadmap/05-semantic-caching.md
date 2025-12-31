# Semantic Caching Layer

**Category:** Performance / Cost
**Quarter:** Q2
**T-shirt Size:** L

## Why This Matters

A significant portion of LLM queries are repetitive (e.g., "Summarize this," "Explain this code," or identical user queries). By caching responses, we can reduce costs by 30-50% and latency by 90% for common requests.

"Semantic" caching goes further by matching *similar* meanings, not just exact string matches.

## Current State

- No caching. Every request goes to OpenAI.

## Proposed Future State

- **Cache Middleware:** Check if a similar prompt exists in the cache vector store.
- **Configurable Threshold:** "Exact match only" vs "95% similarity".
- **Storage:** Use a lightweight vector store (e.g., embedded SQLite-vss or separate Redis).
- **Header Control:** Clients can force bypass with `x-no-cache`.

## Key Deliverables

- [ ] Hashing mechanism for prompts.
- [ ] Cache storage implementation (key-value store for exact match first).
- [ ] (Phase 2) Embedding generation for semantic match (might require a small local model or API call).

## Prerequisites

- **03-database-agnosticism**.

## Risks & Open Questions

- **Privacy:** Caching sensitive PII in the proxy DB is risky. Needs encryption or strict opt-out.
- **Complexity:** Semantic caching requires embeddings. Exact match caching is a good "Quick Win" step before full semantic.

## Notes

Start with **Exact Match Caching** (hash of the prompt) as the MVP. It's cheap and safe.
