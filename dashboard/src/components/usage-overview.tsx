import { RefreshCw } from "lucide-react";
import { Models } from "openai/resources.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn, formatNumber, formatPercentage } from "@/lib/utils";
import type { ReconcileResponse, TierUsage } from "@/types/api";
import { InfoTooltip } from "./info-tooltip";

interface UsageOverviewProps {
	date: string;
	premium: TierUsage;
	mini: TierUsage;
	onReconcile: () => Promise<ReconcileResponse>;
	isReconciling: boolean;
	reconcileStatus?: {
		type: "loading" | "success" | "error";
		message: string;
	};
}

interface TierCardProps {
	title: string;
	limit: string;
	models: string;
	usage: TierUsage;
	variant: "premium" | "mini";
}

function TierCard({ title, limit, models, usage, variant }: TierCardProps) {
	const percentage = usage.percentage;
	const isWarning = percentage >= 75 && percentage < 90;
	const isDanger = percentage >= 90;

	const percentageColor = isDanger
		? "text-red-500"
		: isWarning
			? "text-yellow-500"
			: "text-primary";

	return (
		<div className="p-6 space-y-4 rounded-lg border bg-card/50">
			<div className="flex justify-between items-center">
				<h3 className="flex gap-2 items-center text-lg font-semibold">
					{title}{" "}
					<InfoTooltip
						content={
							<div className="space-y-1">
								<p className="text-sm font-semibold">Available Models</p>

								<ul className="space-y-1 text-xs">
									{models.split(", ").map((model) => (
										<li key={model}>{model}</li>
									))}
								</ul>
							</div>
						}
						side="right"
					/>
				</h3>
				<Badge variant={variant === "premium" ? "default" : "secondary"}>
					{limit}
				</Badge>
			</div>

			<div className="space-y-2">
				<Progress value={Math.min(percentage, 100)} className="h-3" />

				<div className="flex justify-between items-center text-sm">
					<span>
						{formatNumber(usage.used)} / {formatNumber(usage.limit)} tokens
					</span>
					<span className={cn("font-semibold", percentageColor)}>
						{formatPercentage(percentage)}
					</span>
				</div>
			</div>
		</div>
	);
}

export function UsageOverview({
	date,
	premium,
	mini,
	onReconcile,
	isReconciling,
	reconcileStatus,
}: UsageOverviewProps) {
	return (
		<Card>
			<CardHeader>
				<div className="flex justify-between items-start">
					<div>
						<CardTitle className="text-2xl">Token Usage Overview</CardTitle>
						<CardDescription className="mt-1">
							Updated: {new Date().toLocaleString()} ({date})
						</CardDescription>
					</div>
					<Button
						onClick={onReconcile}
						disabled={isReconciling}
						variant="outline"
						size="sm"
					>
						<RefreshCw
							className={cn("mr-2 h-4 w-4", isReconciling && "animate-spin")}
						/>
						Reconcile with OpenAI
					</Button>
				</div>
			</CardHeader>

			<CardContent className="space-y-6">
				{reconcileStatus && (
					<div
						className={cn(
							"rounded-md border p-4 text-sm",
							reconcileStatus.type === "loading" &&
								"border-blue-500 bg-blue-500/10 text-blue-500",
							reconcileStatus.type === "success" &&
								"border-green-500 bg-green-500/10 text-green-500",
							reconcileStatus.type === "error" &&
								"border-red-500 bg-red-500/10 text-red-500",
						)}
					>
						{reconcileStatus.message}
					</div>
				)}

				<div className="grid gap-6 md:grid-cols-2">
					<TierCard
						title="Premium Tier"
						limit="1M tokens/day"
						models="gpt-5, gpt-5-codex, gpt-5-chat-latest, gpt-4.1, gpt-4o, o1, o3" // TODO: Add models
						usage={premium}
						variant="premium"
					/>

					<TierCard
						title="Mini Tier"
						limit="10M tokens/day"
						models="gpt-5-mini, gpt-5-nano, gpt-4.1-mini, gpt-4.1-nano, gpt-4o-mini, o1-mini, o3-mini, o4-mini, codex-mini-latest" // TODO: Add models
						usage={mini}
						variant="mini"
					/>
				</div>
			</CardContent>
		</Card>
	);
}
