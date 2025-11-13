import type { ModelTier } from "../types";
import { getConfig, isDebugMode } from "./config";
import { getCurrentDate, getUsageRecord, incrementTokens } from "./database";
import { getModelTier } from "./models";

/**
 * OpenAI Usage API response structure
 */
interface UsageResult {
	object: string;
	project_id: string | null;
	num_model_requests: number;
	user_id: string | null;
	api_key_id: string | null;
	model: string;
	batch: boolean | null;
	service_tier: string | null;
	input_tokens: number;
	output_tokens: number;
	input_cached_tokens?: number;
	input_uncached_tokens?: number;
	input_text_tokens?: number;
	output_text_tokens?: number;
	input_cached_text_tokens?: number;
	input_audio_tokens?: number;
	input_cached_audio_tokens?: number;
	output_audio_tokens?: number;
	input_image_tokens?: number;
	input_cached_image_tokens?: number;
	output_image_tokens?: number;
}

interface UsageBucket {
	object: string;
	start_time: number;
	end_time: number;
	start_time_iso: string;
	end_time_iso: string;
	results: UsageResult[];
}

interface UsageResponse {
	object: string;
	data: UsageBucket[];
	has_more: boolean;
	next_page: string | null;
}

/**
 * Fetch usage data from OpenAI's Usage API
 * Requires an Admin API key from OpenAI organization settings
 */
export async function fetchOpenAIUsage(
	startTime: number,
	endTime?: number,
	adminKey?: string,
): Promise<UsageResult[]> {
	const _config = getConfig();
	const key = adminKey || process.env.OPENAI_ADMIN_KEY;

	if (!key) {
		throw new Error(
			"OPENAI_ADMIN_KEY is required for usage reconciliation. Get one from https://platform.openai.com/settings/organization/admin-keys",
		);
	}

	const params = new URLSearchParams({
		start_time: startTime.toString(),
		bucket_width: "1d",
		group_by: "model",
	});

	if (endTime) {
		params.append("end_time", endTime.toString());
	}

	const url = `https://api.openai.com/v1/organization/usage/completions?${params}`;
	const allResults: UsageResult[] = [];
	let nextPage: string | undefined;
	let pageCount = 0;

	if (isDebugMode()) {
		console.log("=== OpenAI Usage API Request ===");
		console.log("URL:", url);
		console.log("Parameters:", {
			start_time: startTime,
			end_time: endTime,
			bucket_width: "1d",
			group_by: "model",
		});
	}

	// Handle pagination
	do {
		pageCount++;
		const fetchUrl = nextPage || url;

		if (isDebugMode()) {
			console.log(`\n--- Fetching page ${pageCount} ---`);
			console.log("Fetch URL:", fetchUrl);
		}

		const response = await fetch(fetchUrl, {
			headers: {
				Authorization: `Bearer ${key}`,
				"Content-Type": "application/json",
			},
		});

		if (isDebugMode()) {
			console.log("Response status:", response.status);
			console.log(
				"Response headers:",
				Object.fromEntries(response.headers.entries()),
			);
			console.log(
				"Using admin key:",
				`${key.substring(0, 10)}...${key.substring(key.length - 4)}`,
			);
		}

		if (!response.ok) {
			const error = await response.text();
			console.error("Error response body:", error);
			throw new Error(
				`Failed to fetch usage from OpenAI: ${response.status} - ${error}`,
			);
		}

		const data = (await response.json()) as UsageResponse;

		if (isDebugMode()) {
			console.log("\n=== Raw JSON Response (Page", pageCount, ") ===");
			console.log(JSON.stringify(data, null, 2));
			console.log("=== End Raw JSON ===\n");

			console.log(`Page ${pageCount} summary:`);
			console.log("- Object type:", data.object);
			console.log("- Buckets in this page:", data.data.length);
			console.log("- Has more pages:", data.has_more);
			console.log("- Next page cursor:", data.next_page || "none");
		}

		// Log each bucket and its results in detail
		data.data.forEach((bucket, bucketIndex) => {
			if (isDebugMode()) {
				console.log(`\nBucket ${bucketIndex + 1}:`);
				console.log(
					"  - Time range:",
					bucket.start_time_iso,
					"to",
					bucket.end_time_iso,
				);
				console.log("  - Results in bucket:", bucket.results.length);

				bucket.results.forEach((result, resultIndex) => {
					console.log(`\n  Result ${resultIndex + 1}:`);
					console.log("    - Model:", result.model);
					console.log("    - Input tokens:", result.input_tokens);
					console.log("    - Output tokens:", result.output_tokens);
					console.log(
						"    - Total tokens:",
						result.input_tokens + result.output_tokens,
					);
					console.log("    - Requests:", result.num_model_requests);
					if (result.input_cached_tokens) {
						console.log("    - Cached tokens:", result.input_cached_tokens);
					}
					if (result.input_audio_tokens || result.output_audio_tokens) {
						console.log("    - Audio tokens:", {
							input: result.input_audio_tokens || 0,
							output: result.output_audio_tokens || 0,
						});
					}
					if (result.project_id) {
						console.log("    - Project ID:", result.project_id);
					}
				});
			}

			// Flatten: add all results from this bucket to our results array
			allResults.push(...bucket.results);
		});

		nextPage = data.next_page ?? undefined;
	} while (nextPage);

	if (isDebugMode()) {
		console.log(
			`\n=== Total: ${allResults.length} results across ${pageCount} page(s) ===\n`,
		);
	}

	return allResults;
}

/**
 * Reconcile local database with OpenAI's actual usage data
 * This fills in gaps from streaming requests and corrects any discrepancies
 */
export async function reconcileUsage(date?: string): Promise<{
	success: boolean;
	date: string;
	premium: { before: number; after: number; added: number };
	mini: { before: number; after: number; added: number };
	details: string[];
}> {
	const targetDate = date || getCurrentDate();

	if (isDebugMode()) {
		console.log("Target date for reconciliation:", targetDate);
		console.log("Target date type:", typeof targetDate);
	}

	// Convert date to Unix timestamps (start and end of day in UTC)
	const dateStr = `${targetDate}T00:00:00Z`;

	if (isDebugMode()) {
		console.log("Creating Date object from:", dateStr);
	}

	const dateObj = new Date(dateStr);

	if (isDebugMode()) {
		console.log("Date object created:", dateObj);
		console.log("Date is valid:", !Number.isNaN(dateObj.getTime()));
	}

	if (Number.isNaN(dateObj.getTime())) {
		throw new Error(
			`Invalid date: "${targetDate}". Expected format: YYYY-MM-DD`,
		);
	}

	const startTime = Math.floor(dateObj.getTime() / 1000);
	const endTime = startTime + 86400; // +24 hours

	console.log(`Reconciling usage for ${targetDate}...`);

	// Get current usage from our database
	const premiumBefore = getUsageRecord("premium");
	const miniBefore = getUsageRecord("mini");

	if (!premiumBefore || !miniBefore) {
		throw new Error("Usage records not initialized");
	}

	const details: string[] = [];

	try {
		// Fetch actual usage from OpenAI
		const results = await fetchOpenAIUsage(startTime, endTime);

		if (isDebugMode()) {
			console.log(`\n=== Processing ${results.length} usage results ===`);
		}

		// Group by tier and sum tokens
		const tierTotals: Record<ModelTier, number> = {
			premium: 0,
			mini: 0,
		};

		const modelBreakdown: Record<string, { tier: ModelTier; tokens: number }> =
			{};

		for (const result of results) {
			const tier = getModelTier(result.model);
			const totalTokens = result.input_tokens + result.output_tokens;

			if (isDebugMode()) {
				console.log(
					`Processing: ${result.model} → ${tier} tier (${totalTokens} tokens)`,
				);
			}

			tierTotals[tier] += totalTokens;

			let modelEntry = modelBreakdown[result.model];
			if (!modelEntry) {
				modelEntry = { tier, tokens: 0 };
				modelBreakdown[result.model] = modelEntry;
			}
			modelEntry.tokens += totalTokens;

			details.push(
				`${result.model} (${tier}): ${totalTokens.toLocaleString()} tokens`,
			);
		}

		if (isDebugMode()) {
			console.log("\n=== Model Breakdown ===");
			for (const [model, data] of Object.entries(modelBreakdown)) {
				console.log(
					`  ${model} (${data.tier}): ${data.tokens.toLocaleString()} tokens`,
				);
			}

			console.log("\n=== Tier Totals Comparison ===");
			console.log("Premium Tier:");
			console.log(
				"  - OpenAI reports:",
				tierTotals.premium.toLocaleString(),
				"tokens",
			);
			console.log(
				"  - Our database has:",
				premiumBefore.tokens_used.toLocaleString(),
				"tokens",
			);
			console.log(
				"  - Difference:",
				(tierTotals.premium - premiumBefore.tokens_used).toLocaleString(),
				"tokens",
			);

			console.log("\nMini Tier:");
			console.log(
				"  - OpenAI reports:",
				tierTotals.mini.toLocaleString(),
				"tokens",
			);
			console.log(
				"  - Our database has:",
				miniBefore.tokens_used.toLocaleString(),
				"tokens",
			);
			console.log(
				"  - Difference:",
				(tierTotals.mini - miniBefore.tokens_used).toLocaleString(),
				"tokens",
			);
		}

		// Calculate the difference (what we missed)
		const premiumDiff = Math.max(
			0,
			tierTotals.premium - premiumBefore.tokens_used,
		);
		const miniDiff = Math.max(0, tierTotals.mini - miniBefore.tokens_used);

		// Update our database with the difference
		if (premiumDiff > 0) {
			console.log(
				`Adding ${premiumDiff.toLocaleString()} tokens to premium tier`,
			);
			incrementTokens("premium", premiumDiff);
		}

		if (miniDiff > 0) {
			console.log(`Adding ${miniDiff.toLocaleString()} tokens to mini tier`);
			incrementTokens("mini", miniDiff);
		}

		// Get updated values
		const premiumAfter = getUsageRecord("premium") ?? { tokens_used: 0 };
		const miniAfter = getUsageRecord("mini") ?? { tokens_used: 0 };

		const totalAdded = premiumDiff + miniDiff;
		if (totalAdded > 0) {
			console.log(
				`Reconciliation complete: Added ${totalAdded.toLocaleString()} tokens`,
			);
		} else {
			console.log("Reconciliation complete: No updates needed");
		}

		if (isDebugMode()) {
			console.log("\n=== Reconciliation Summary ===");
			console.log("Date:", targetDate);
			console.log("Premium:", {
				before: premiumBefore.tokens_used,
				after: premiumAfter.tokens_used,
				added: premiumDiff,
			});
			console.log("Mini:", {
				before: miniBefore.tokens_used,
				after: miniAfter.tokens_used,
				added: miniDiff,
			});
			console.log("==============================\n");
		}

		return {
			success: true,
			date: targetDate,
			premium: {
				before: premiumBefore.tokens_used,
				after: premiumAfter.tokens_used,
				added: premiumDiff,
			},
			mini: {
				before: miniBefore.tokens_used,
				after: miniAfter.tokens_used,
				added: miniDiff,
			},
			details,
		};
	} catch (error) {
		console.error(
			"Reconciliation failed:",
			error instanceof Error ? error.message : error,
		);
		throw error;
	}
}

/**
 * Get the start of today in Unix timestamp (UTC)
 */
export function getTodayStartTimestamp(): number {
	const today = getCurrentDate();
	const dateObj = new Date(`${today}T00:00:00Z`);
	return Math.floor(dateObj.getTime() / 1000);
}
