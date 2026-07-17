import { cn } from "#lib/utils";

interface BlogEmptyStateProps {
	message?: string;
	className?: string;
}

/**
 * Branded empty state for blog pages with CSS-only typewriter animation.
 * Displays animated writing lines that expand left-to-right with a blinking cursor.
 * Matches the pattern of ChartLoadingSkeleton and BlogLoadingSkeleton.
 */
export function BlogEmptyState({
	message = "No posts found",
	className,
}: BlogEmptyStateProps) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/20 p-12",
				className,
			)}
			role="status"
			aria-label={message}
		>
			<div className="flex flex-col gap-2.5 w-48">
				<div className="h-2.5 rounded bg-primary/20 origin-left animate-[typewriter-line_2.4s_ease-in-out_infinite] w-full [animation-delay:0ms]" />
				<div className="h-2.5 rounded bg-primary/30 origin-left animate-[typewriter-line_2.4s_ease-in-out_infinite] w-[85%] [animation-delay:var(--duration-300)]" />
				<div className="h-2.5 rounded bg-primary/20 origin-left animate-[typewriter-line_2.4s_ease-in-out_infinite] w-[92%] [animation-delay:var(--duration-500)]" />
				<div className="flex items-center w-[60%]">
					<div className="h-2.5 rounded bg-primary/30 origin-left animate-[typewriter-line_2.4s_ease-in-out_infinite] flex-1 [animation-delay:var(--duration-1000)]" />
					<div className="ml-0.5 h-3.5 w-0.5 bg-primary/50 animate-[typewriter-cursor_0.8s_step-end_infinite]" />
				</div>
			</div>
			<p className="text-sm text-muted-foreground">{message}</p>
			<style>{`
				@keyframes typewriter-line {
					0% { transform: scaleX(0); opacity: 0.2; }
					25% { transform: scaleX(1); opacity: 0.8; }
					75% { transform: scaleX(1); opacity: 0.8; }
					100% { transform: scaleX(0); opacity: 0.2; }
				}
				@keyframes typewriter-cursor {
					0%, 100% { opacity: 0; }
					50% { opacity: 1; }
				}
			`}</style>
			<span className="sr-only">{message}</span>
		</div>
	);
}
