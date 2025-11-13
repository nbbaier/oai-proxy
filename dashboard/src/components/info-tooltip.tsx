import { Info } from "lucide-react";
import type React from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
	content: React.ReactNode;
	side?: "top" | "right" | "bottom" | "left";
	className?: string;
	iconClassName?: string;
	contentClassName?: string;
}

export function InfoTooltip({
	content,
	side = "top",
	className,
	iconClassName,
	contentClassName,
}: InfoTooltipProps) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						className={cn(
							"inline-flex justify-center items-center rounded-full transition-colors text-muted-foreground hover:text-foreground",
							className,
						)}
						aria-label="More information"
					>
						<Info className={cn("w-4 h-4", iconClassName)} />
					</button>
				</TooltipTrigger>
				<TooltipContent side={side}>
					<p className={cn("text-sm", contentClassName)}>{content}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
