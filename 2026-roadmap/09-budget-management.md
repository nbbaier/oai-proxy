# Budget & Cost Management

**Category:** Business Logic
**Quarter:** Q3
**T-shirt Size:** M

## Why This Matters

Tokens are a proxy for cost, but users care about dollars. "1M tokens" means nothing to a finance department. "We spent $15.00" does.

Different models have vastly different prices. 1M GPT-4o tokens cost much more than 1M GPT-3.5 tokens.

## Current State

- Tracks "Tokens".
- Blind to the actual cost difference between models.

## Proposed Future State

- **Price Catalog:** Store current pricing per 1k input/output tokens for each model.
- **Cost Calculation:** Calculate `cost_usd` for every transaction.
- **Budget Limits:** "Stop Alice if she spends > $50 this month."

## Key Deliverables

- [ ] DB update: add `cost_usd` column to history.
- [ ] Pricing service/config (needs regular updates).
- [ ] Dashboard update: Show "$" spent alongside tokens.

## Prerequisites

- **04-dynamic-tier-configuration** (pricing is metadata of a model).

## Risks & Open Questions

- **Stale Pricing:** Prices change. We might need to fetch them from an external API or allow manual overrides.

## Notes

This enables "Chargeback" reports for enterprises.
