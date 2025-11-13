export default function Loading() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="text-center space-y-4">
				<div className="size-16 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
				<p className="text-muted-foreground">Loading...</p>
			</div>
		</div>
	)
}
