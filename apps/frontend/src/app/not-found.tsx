import Link from 'next/link'

export const metadata = {
	title: '404 - Page Not Found | TenantFlow'
}

export default function NotFound() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-5">
			<div className="mx-auto max-w-md space-y-6 px-4 text-center">
				<div className="space-y-4">
					<h1 className="text-4xl font-bold text-gray-9">404</h1>
					<h2 className="text-2xl font-semibold text-gray-9">
						Page Not Found
					</h2>
					<p className="text-gray-6">
						The page you&apos;re looking for could not be found.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<Link
						href="/dashboard"
						className="rounded-lg bg-blue-6 px-6 py-3 text-white hover:bg-blue-7"
					>
						Go to Dashboard
					</Link>
					<Link
						href="/"
						className="rounded-lg bg-gray-1 px-6 py-3 text-gray-7 hover:bg-gray-2"
					>
						Visit Homepage
					</Link>
				</div>
			</div>
		</div>
	)
}
