import type { Context } from "hono";
import type { OpenAIResponse, OpenAIUsage } from "../types";
import { getConfig } from "./config";
import {
	addRequestHistory,
	checkAndResetDaily,
	getUsageRecord,
	incrementTokens,
} from "./database";
import { getModelTier } from "./models";

const OPENAI_API_BASE = "https://api.openai.com";

/**
 * Handle proxy request to OpenAI API
 */
export async function proxyRequest(c: Context): Promise<Response> {
	const config = getConfig();

	// Check for daily reset
	checkAndResetDaily();

	// Get the request path (everything after /v1)
	const path = c.req.path;

	// Get the model from the request body
	let model: string | undefined;
	let requestBody: any;

	try {
		// Clone the request to read the body
		const bodyText = await c.req.text();
		requestBody = bodyText ? JSON.parse(bodyText) : {};
		model = requestBody.model;
	} catch (error) {
		return c.json(
			{
				error: {
					message: "Invalid request body",
					type: "invalid_request_error",
				},
			},
			400,
		);
	}

	if (!model) {
		return c.json(
			{
				error: {
					message: "Model parameter is required",
					type: "invalid_request_error",
				},
			},
			400,
		);
	}

	// Determine the tier for this model
	const tier = getModelTier(model);

	// Check current usage against limit
	const usageRecord = getUsageRecord(tier);
	if (!usageRecord) {
		return c.json(
			{
				error: {
					message: "Usage tracking not initialized",
					type: "server_error",
				},
			},
			500,
		);
	}

	// Check if limit is exceeded
	if (usageRecord.tokens_used >= usageRecord.limit) {
		const resetInfo = `Daily limit for ${tier} tier exceeded (${usageRecord.tokens_used}/${usageRecord.limit} tokens). Resets at 00:00 UTC.`;

		return c.json(
			{
				error: {
					message: resetInfo,
					type: "rate_limit_error",
					code: "daily_token_limit_exceeded",
				},
			},
			429,
		);
	}

	// Check if this is a streaming request
	const isStreaming = requestBody.stream === true;

	// Forward the request to OpenAI
	try {
		const openaiResponse = await fetch(`${OPENAI_API_BASE}${path}`, {
			method: c.req.method,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${config.OPENAI_API_KEY}`,
				// Forward other relevant headers
				...(c.req.header("OpenAI-Organization") && {
					"OpenAI-Organization": c.req.header("OpenAI-Organization")!,
				}),
			},
			body: JSON.stringify(requestBody),
		});

		// Handle streaming responses differently
		if (isStreaming) {
			console.log(
				`Streaming request: ${model} (${tier} tier) - token tracking not available for streaming`,
			);

			// Pass through the streaming response as-is
			return new Response(openaiResponse.body, {
				status: openaiResponse.status,
				headers: {
					"Content-Type": openaiResponse.headers.get("Content-Type") || "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
					"Access-Control-Allow-Origin": "*",
				},
			});
		}

		// Handle non-streaming responses
		const responseClone = openaiResponse.clone();
		const responseData = await responseClone.json();

		// Extract token usage if available
		const usage: OpenAIUsage | undefined = responseData.usage;

		if (usage && usage.total_tokens > 0) {
			// Update usage tracking
			incrementTokens(tier, usage.total_tokens);

			// Add to request history
			addRequestHistory({
				timestamp: new Date().toISOString(),
				model,
				prompt_tokens: usage.prompt_tokens,
				completion_tokens: usage.completion_tokens,
				total_tokens: usage.total_tokens,
				request_path: path,
				status: openaiResponse.status,
				tier,
			});

			console.log(
				`Request tracked: ${model} (${tier} tier) - ${usage.total_tokens} tokens used`,
			);
		}

		// Return the OpenAI response as-is
		return new Response(JSON.stringify(responseData), {
			status: openaiResponse.status,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (error) {
		console.error("Error proxying request to OpenAI:", error);

		return c.json(
			{
				error: {
					message: "Failed to proxy request to OpenAI API",
					type: "server_error",
				},
			},
			500,
		);
	}
}

/**
 * Handle OPTIONS requests for CORS
 */
export function handleOptions(c: Context): Response {
	return new Response(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers":
				"Content-Type, Authorization, OpenAI-Organization",
			"Access-Control-Max-Age": "86400",
		},
	});
}
