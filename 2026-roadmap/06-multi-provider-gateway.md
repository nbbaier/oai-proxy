# Multi-Provider Gateway

**Category:** Feature / Scalability
**Quarter:** Q2
**T-shirt Size:** XL

## Why This Matters

Vendor lock-in is a real concern. Users want to try Anthropic's Claude 3.5, Google's Gemini 1.5, or local models via Ollama.

This initiative transforms the project from "OpenAI Proxy" to "Unified AI Gateway." It allows users to swap models by just changing a config, without rewriting their client code (which expects OpenAI format).

## Current State

- Hardcoded to `api.openai.com`.
- OpenAI-specific types and error handling.

## Proposed Future State

- **Unified Interface:** The proxy accepts OpenAI-format requests but can route them to Anthropic, Google, or Ollama.
- **Adapters:** "Translation layers" that convert OpenAI JSON schema to Anthropic JSON schema and back.
- **Route Configuration:** Map `model: "claude-3-opus"` to the Anthropic adapter.

## Key Deliverables

- [ ] Adapter Interface pattern.
- [ ] Anthropic Adapter.
- [ ] Google Gemini Adapter.
- [ ] Ollama Adapter.
- [ ] Response normalization (convert all usage/choices to OpenAI format).

## Prerequisites

- **01-streaming-token-accuracy** (streams work differently across providers).

## Risks & Open Questions

- **Maintenance:** Keeping up with API changes of 4+ providers is work.
- **Feature Parity:** Not all features map 1:1 (e.g., function calling formats vary). We may need to support the "lowest common denominator" or specific extensions.

## Notes

There are libraries like `portkey-ai` or `litellm` that handle this. We could integrate one of them as a dependency instead of reinventing the wheel.
