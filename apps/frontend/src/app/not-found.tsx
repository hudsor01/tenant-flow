import Link from 'next/link'

export default function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center p-8 font-sans text-center">
			<div className="max-w-md w-full">
				<div
					className="text-[8rem] leading-none font-black mb-8 bg-gradient-to-r from-[var(--color-accent-main)] to-[var(--color-accent-85)] bg-clip-text text-transparent"
				>
					404
				</div>

				<div className="mb-8">
					<h1 className="text-3xl font-bold mb-4">Page not found</h1>
					<p
						className="mb-8 text-[var(--color-label-secondary)]"
					>
						The page you&apos;re looking for doesn&apos;t exist or has been moved.
					</p>
				</div>

				<div className="flex gap-4 justify-center flex-wrap">
					<Link
						href="/"
						className="px-6 py-3 rounded-lg font-medium text-white no-underline bg-[var(--color-accent-main)]"
					>
						← Back to Home
					</Link>

					<Link
						href="/contact"
						className="px-6 py-3 rounded-lg font-medium no-underline border-2 border-[var(--color-accent-main)] text-[var(--color-accent-main)]"
					>
						Get Help
					</Link>
				</div>
			</div>
		</div>
	)
}
