import Link from 'next/link'
import { Button } from '#components/ui/button'

export default function PortalNotFound() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen gap-4">
			<h1 className="typography-h1">404</h1>
			<p className="text-xl text-muted-foreground">
				Portal page not found
			</p>
			<Button asChild>
				<Link href="/tenant">Return to Portal</Link>
			</Button>
		</div>
	)
}
