import Link from 'next/link'
import { Button } from '#components/ui/button'

export default function DashboardNotFound() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen gap-(--spacing-4)">
			<h1 className="text-4xl font-bold">404</h1>
			<p className="text-xl text-muted-foreground">
				Dashboard page not found
			</p>
			<Button asChild>
				<Link href="/">Return to Dashboard</Link>
			</Button>
		</div>
	)
}
