'use client'

export default function Error({
	reset
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center gap-4 font-sans p-8">
			<h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
			<button
				onClick={() => reset()}
				className="px-6 py-3 text-white border-none rounded-lg text-base cursor-pointer bg-accent-main"
			>
				Try again
			</button>
		</div>
	)
}
