interface ErrorDisplayProps {
	error: string | null
	className?: string
}

export function ErrorDisplay({ error, className }: ErrorDisplayProps) {
<<<<<<< HEAD
	if (!error) {
		return null
	}
=======
	if (!error) return null
>>>>>>> origin/main

	return (
		<div
			className={`bg-destructive/10 border-destructive/20 rounded-md border p-3 ${className ?? ''}`}
		>
			<p className="text-destructive text-sm">{error}</p>
		</div>
	)
}
