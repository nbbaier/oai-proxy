import type { ModelTier } from "../types";

/**
 * Premium tier models (1M tokens/day limit)
 * Includes: gpt-5, gpt-5-codex, gpt-5-chat-latest, gpt-4.1, gpt-4o, o1, o3
 */
const PREMIUM_MODELS = [
	"gpt-5",
	"gpt-5-codex",
	"gpt-5-chat-latest",
	"gpt-4.1",
	"gpt-4o",
	"o1",
	"o3",
];

/**
 * Mini tier models (10M tokens/day limit)
 * Includes: gpt-5-mini, gpt-5-nano, gpt-4.1-mini, gpt-4.1-nano, gpt-4o-mini,
 * o1-mini, o3-mini, o4-mini, codex-mini-latest
 */
const MINI_MODELS = [
	"gpt-5-mini",
	"gpt-5-nano",
	"gpt-4.1-mini",
	"gpt-4.1-nano",
	"gpt-4o-mini",
	"o1-mini",
	"o3-mini",
	"o4-mini",
	"codex-mini-latest",
];

/**
 * Determines the tier for a given model
 * @param model The OpenAI model name
 * @returns The model tier ('premium' or 'mini')
 */
export function getModelTier(model: string): ModelTier {
	// Check if model starts with any of the premium model prefixes
	const isPremium = PREMIUM_MODELS.some((prefix) => model.startsWith(prefix));
	if (isPremium) return "premium";

	// Check if model starts with any of the mini model prefixes
	const isMini = MINI_MODELS.some((prefix) => model.startsWith(prefix));
	if (isMini) return "mini";

	// Default to premium tier for unknown models (safer, more restrictive)
	console.warn(`Unknown model "${model}" - defaulting to premium tier`);
	return "premium";
}

/**
 * Get all models for a given tier
 * @param tier The model tier
 * @returns Array of model prefixes for that tier
 */
export function getModelsForTier(tier: ModelTier): string[] {
	return tier === "premium" ? PREMIUM_MODELS : MINI_MODELS;
}
