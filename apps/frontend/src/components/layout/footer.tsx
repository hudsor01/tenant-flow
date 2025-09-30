import Link from 'next/link'

export default function Footer() {
	return (
		<footer className="bg-background py-4">
			<div className="max-w-7xl mx-auto px-4">
				<div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
					<div className="flex items-center space-x-2">
						<div className="w-4 h-4 rounded bg-primary flex items-center justify-center">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								className="w-2.5 h-2.5 text-primary-foreground"
							>
								<path
									d="M3 21L21 21M5 21V7L12 3L19 7V21M9 12H15M9 16H15"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
						<span className="font-medium text-foreground">TenantFlow</span>
					</div>

					<Link
						href="/terms"
						className="hover:text-foreground transition-colors"
					>
						Terms
					</Link>
					<Link href="/privacy" className="hover:text-foreground transition-colors">
						Privacy
					</Link>
					<Link
						href="/help"
						className="hover:text-foreground transition-colors"
					>
						Help
					</Link>

					<Link
						href="https://hudsondigitalsolutions.com"
						target="_blank"
						rel="noopener noreferrer"
						className="hover:text-foreground transition-colors"
					>
						Powered by Hudson Digital
					</Link>

					<span>© 2025 TenantFlow. All rights reserved.</span>
				</div>
			</div>
		</footer>
	)
}
