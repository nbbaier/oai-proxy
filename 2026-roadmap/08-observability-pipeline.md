# Observability Pipeline (OpenTelemetry)

**Category:** DevOps / Architecture
**Quarter:** Q3
**T-shirt Size:** M

## Why This Matters

`console.log` is not an observability strategy. To run this in production, operators need to see traces (how long did OpenAI take? how long did the DB take?) and metrics (error rates, P99 latency).

OpenTelemetry (OTel) is the industry standard.

## Current State

- `console.log` statements scattered in `proxy.ts`.
- No metrics.

## Proposed Future State

- **Tracing:** Trace every request from ingress -> auth -> db -> openai -> response.
- **Metrics:** Expose Prometheus metrics (`http_requests_total`, `token_usage_total`).
- **Exporter:** Send data to Jaeger, Honeycomb, or DataDog.

## Key Deliverables

- [ ] Add `@opentelemetry/sdk-node` and instrumentation.
- [ ] Create spans for internal operations (DB queries).
- [ ] Add a `/metrics` endpoint for Prometheus.

## Prerequisites

None.

## Risks & Open Questions

- **Overhead:** OTel can add some weight.
- **Complexity:** Setting up a collector/viewer (Jaeger) in the Docker Compose stack increases the "getting started" friction. Make it optional.

## Notes

This helps answer "Why was that request so slow?"
