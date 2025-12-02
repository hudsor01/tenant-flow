export default function PortalLoading() {
	return (
		<div className="flex-center min-h-screen">
			<div className="flex flex-col items-center gap-(--spacing-4)">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
				<p className="text-muted-foreground">Loading portal...</p>
			</div>
		</div>
	)
}
