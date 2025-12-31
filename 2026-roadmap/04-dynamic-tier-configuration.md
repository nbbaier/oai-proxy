# Dynamic Tier Configuration

**Category:** DX Improvement
**Quarter:** Q2
**T-shirt Size:** S

## Why This Matters

The distinction between "Premium" and "Mini" models is hardcoded in `src/lib/models.ts`. Every time OpenAI releases a new model (which happens frequently), the proxy requires a code update and redeployment.

Moving this configuration to the database (or a hot-reloadable config file) allows users to define their own tiers ("Experimental", "Production", "Legacy") and assign models dynamically.

## Current State

- Hardcoded `PREMIUM_MODELS` and `MINI_MODELS` arrays.
- `getModelTier` function has fixed logic.
- Only two tiers exist.

## Proposed Future State

- **Custom Tiers:** Users can create N tiers (e.g., "GPT-4", "GPT-3.5", "Claude-Opus").
- **Wildcard Matching:** Support patterns like `gpt-4*`.
- **UI Management:** specialized page in the dashboard to drag-and-drop models into tiers.

## Key Deliverables

- [ ] New DB tables: `tiers`, `model_mappings`.
- [ ] Admin UI to manage tiers and limits.
- [ ] Update `getModelTier` to query cached config.

## Prerequisites

- **03-database-agnosticism** (makes schema changes easier).

## Risks & Open Questions

- **Caching:** We don't want to hit the DB for every request to check the tier. We need an in-memory cache of the tier config that invalidates on update.

## Notes

This prevents the repo from becoming "stale" every time Sam Altman tweets.
