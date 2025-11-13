export type ModelTier = "premium" | "mini";

export interface TierUsage {
	used: number;
	limit: number;
	percentage: number;
}

export interface UsageResponse {
	date: string;
	premium: TierUsage;
	mini: TierUsage;
}

export interface RequestHistoryEntry {
	id: number;
	timestamp: string;
	model: string;
	tier: ModelTier;
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
	status: number;
}

export interface Pagination {
	limit: number;
	offset: number;
	total: number;
	hasMore: boolean;
}

export interface HistoryResponse {
	data: RequestHistoryEntry[];
	pagination: Pagination;
}

export interface ReconcileResponse {
	success: boolean;
	date: string;
	premium: {
		before: number;
		after: number;
		added: number;
	};
	mini: {
		before: number;
		after: number;
		added: number;
	};
	error?: string;
}
