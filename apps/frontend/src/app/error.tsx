'use client'

interface ErrorProps {
	error: Error & { digest?: string }
	reset: () => void
}

export default function Error({ reset }: ErrorProps) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-5">
			<div className="mx-auto max-w-md space-y-6 px-4 text-center">
				<h1 className="text-2xl font-semibold text-gray-9">
					Something went wrong
				</h1>
				<p className="text-gray-6">
					We encountered an unexpected error.
				</p>
				<div className="flex flex-col gap-4">
					<button
						onClick={reset}
						className="rounded-lg bg-blue-6 px-6 py-3 text-white hover:bg-blue-7"
					>
						Try Again
					</button>
					<a
						href="/dashboard"
						className="rounded-lg bg-gray-1 px-6 py-3 text-gray-7 hover:bg-gray-2"
					>
						Go to Dashboard
					</a>
				</div>
			</div>
		</div>
	)
}
