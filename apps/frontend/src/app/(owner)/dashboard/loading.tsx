export default function DashboardLoading() {
	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="flex flex-col items-center gap-(--spacing-4)">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
				<p className="text-muted-foreground">Loading dashboard...</p>
			</div>
		</div>
	)
}
