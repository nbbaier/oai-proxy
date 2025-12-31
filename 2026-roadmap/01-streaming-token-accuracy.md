# Real-Time Streaming Token Accuracy

**Category:** DX Improvement
**Quarter:** Q1
**T-shirt Size:** M

## Why This Matters

Streaming is the dominant interaction pattern for LLM applications (chatbots, agents), but the current proxy implementation explicitly disables token tracking for streaming requests. This forces users to rely on "reconciliation" steps, creating a delayed and inaccurate view of usage.

By implementing real-time tracking for streams, we close a major observability gap and prevent "surprise" overages that occur between reconciliation windows.

## Current State

- `src/lib/proxy.ts` detects `stream: true` and logs "token tracking not available for streaming".
- It pipes the raw response from OpenAI to the client.
- Users must manually trigger `/api/reconcile` to get accurate counts from OpenAI's Admin API.

## Proposed Future State

The proxy transparently handles `stream_options: { include_usage: true }` for OpenAI requests.
1. It injects this parameter into upstream requests if not present.
2. It parses the server-sent events (SSE) stream on the fly.
3. It extracts the final usage chunk (which OpenAI provides at the end of the stream).
4. It updates the database immediately after the request completes.

To the user, it just works. The dashboard updates in real-time even for streaming conversations.

## Key Deliverables

- [ ] Support for `stream_options` injection in `proxyRequest`.
- [ ] A `TransformStream` implementation that parses SSE chunks without buffering the whole response.
- [ ] Logic to extract `usage` from the final chunk.
- [ ] Async database update trigger upon stream completion.

## Prerequisites

None.

## Risks & Open Questions

- **Performance:** Parsing every chunk adds a slight overhead. We need to ensure zero-copy or efficient parsing to avoid latency.
- **Client Compatibility:** If we inject `stream_options`, does it change the client behavior? (Usually, clients just ignore extra fields, but we should verify).
- **Disconnects:** If a client disconnects mid-stream, we might miss the final usage chunk. We may need to keep reading the stream from upstream even if the downstream client hangs up.

## Notes

Reference: [OpenAI API stream_options](https://platform.openai.com/docs/api-reference/chat/create#chat-create-stream_options)
