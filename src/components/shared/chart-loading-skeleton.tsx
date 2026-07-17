/**
 * CSS-only rising bars animation for chart loading states.
 * Used as the fallback for dynamically imported chart components.
 */
export function ChartLoadingSkeleton() {
	return (
		<div
			className="flex items-end justify-center gap-3 h-64 w-full rounded-lg border border-dashed border-border bg-muted/20 p-8"
			role="status"
			aria-label="Loading chart"
		>
			<div className="w-8 rounded-t-sm bg-primary/20 animate-[chart-rise_1.4s_ease-in-out_infinite] h-[40%] [animation-delay:0ms]" />
			<div className="w-8 rounded-t-sm bg-primary/30 animate-[chart-rise_1.4s_ease-in-out_infinite] h-[65%] [animation-delay:var(--duration-200)]" />
			<div className="w-8 rounded-t-sm bg-primary/40 animate-[chart-rise_1.4s_ease-in-out_infinite] h-[45%] [animation-delay:var(--duration-300)]" />
			<div className="w-8 rounded-t-sm bg-primary/30 animate-[chart-rise_1.4s_ease-in-out_infinite] h-[80%] [animation-delay:var(--duration-500)]" />
			<div className="w-8 rounded-t-sm bg-primary/20 animate-[chart-rise_1.4s_ease-in-out_infinite] h-[55%] [animation-delay:var(--duration-700)]" />
			<style>{`
				@keyframes chart-rise {
					0%, 100% { transform: scaleY(0.4); opacity: 0.4; }
					50% { transform: scaleY(1); opacity: 1; }
				}
			`}</style>
			<span className="sr-only">Loading chart data</span>
		</div>
	);
}

export default ChartLoadingSkeleton;
