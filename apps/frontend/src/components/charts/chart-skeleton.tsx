export function ChartSkeleton() {
	return (
		<div className="h-[300px] rounded-lg bg-muted animate-pulse">
			<div className="flex items-end justify-around h-full p-4 gap-2">
				<div className="bg-muted-foreground/20 rounded w-full h-1/3" />
				<div className="bg-muted-foreground/20 rounded w-full h-2/3" />
				<div className="bg-muted-foreground/20 rounded w-full h-1/2" />
				<div className="bg-muted-foreground/20 rounded w-full h-4/5" />
			</div>
		</div>
	)
}
