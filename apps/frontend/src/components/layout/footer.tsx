import Link from 'next/link'
import { Home } from 'lucide-react'

export default function Footer() {
	return (
		<footer className="bg-background py-[var(--spacing-4)]">
			<div className="max-w-7xl mx-auto px-[var(--spacing-4)]">
			<div
				className="flex justify-center items-center gap-[var(--spacing-8)] text-muted-foreground"
				style={{ fontSize: 'var(--text-sm)' }}
			>
					<div className="flex items-center space-x-2">
						<div className="rounded bg-primary flex items-center justify-center w-[var(--spacing-4)] h-[var(--spacing-4)] min-w-[var(--spacing-4)] min-h-[var(--spacing-4)]">
							<Home className="w-[var(--spacing-2_5)] h-[var(--spacing-2_5)] text-primary-foreground" />
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
