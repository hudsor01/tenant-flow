/**
 * CSS-only text-reveal animation for blog/markdown loading states.
 * Lines appear sequentially mimicking writing flow with a left-to-right reveal.
 */
export function BlogLoadingSkeleton() {
	return (
		<div
			className="flex flex-col gap-3 w-full py-4"
			role="status"
			aria-label="Loading content"
		>
			<div
				className="h-4 rounded bg-muted animate-[text-reveal_1.8s_ease-in-out_infinite]"
				style={{ width: "92%", animationDelay: "0ms" }}
			/>
			<div
				className="h-4 rounded bg-muted animate-[text-reveal_1.8s_ease-in-out_infinite]"
				style={{ width: "100%", animationDelay: "var(--duration-100)" }}
			/>
			<div
				className="h-4 rounded bg-muted animate-[text-reveal_1.8s_ease-in-out_infinite]"
				style={{ width: "85%", animationDelay: "var(--duration-200)" }}
			/>
			<div
				className="h-4 rounded bg-muted animate-[text-reveal_1.8s_ease-in-out_infinite]"
				style={{ width: "96%", animationDelay: "var(--duration-300)" }}
			/>
			<div
				className="h-4 rounded bg-muted animate-[text-reveal_1.8s_ease-in-out_infinite]"
				style={{ width: "78%", animationDelay: "var(--duration-500)" }}
			/>
			<div className="h-6" />
			<div
				className="h-4 rounded bg-muted animate-[text-reveal_1.8s_ease-in-out_infinite]"
				style={{ width: "88%", animationDelay: "var(--duration-700)" }}
			/>
			<div
				className="h-4 rounded bg-muted animate-[text-reveal_1.8s_ease-in-out_infinite]"
				style={{ width: "65%", animationDelay: "var(--duration-1000)" }}
			/>
			<style>{`
				@keyframes text-reveal {
					0% { opacity: 0.15; transform: scaleX(0.3); transform-origin: left; }
					30% { opacity: 0.6; transform: scaleX(1); }
					60% { opacity: 0.6; transform: scaleX(1); }
					100% { opacity: 0.15; transform: scaleX(0.3); transform-origin: left; }
				}
			`}</style>
			<span className="sr-only">Loading content</span>
		</div>
	);
}

export default BlogLoadingSkeleton;
