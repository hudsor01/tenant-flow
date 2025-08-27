'use client'

interface ErrorProps {
	error: Error & { digest?: string }
	reset: () => void
}

export default function Error({ reset }: ErrorProps) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="mx-auto max-w-md space-y-6 px-4 text-center">
				<h1 className="text-2xl font-semibold text-gray-900">
					Something went wrong
				</h1>
				<p className="text-gray-600">
					We encountered an unexpected error.
				</p>
				<div className="flex flex-col gap-4">
					<button
						onClick={reset}
						className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
					>
						Try Again
					</button>
					<a
						href="/dashboard"
						className="rounded-lg bg-gray-100 px-6 py-3 text-gray-700 hover:bg-gray-200"
					>
						Go to Dashboard
					</a>
				</div>
			</div>
		</div>
	)
}
