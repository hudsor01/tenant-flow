import { Alert, AlertDescription, AlertTitle } from '#components/ui/alert'
import { Button } from '#components/ui/button'
import { Home } from 'lucide-react'
import Link from 'next/link'

interface NotFoundPageProps {
	dashboardHref?: string
}

export function NotFoundPage({ dashboardHref = '/dashboard' }: NotFoundPageProps) {
	return (
		<section className="flex min-h-[400px] items-center justify-center p-8">
			<div className="max-w-md w-full space-y-4">
				<Alert variant="destructive">
					<AlertTitle>Page not found</AlertTitle>
					<AlertDescription>
						The page you are looking for does not exist or has been removed.
					</AlertDescription>
				</Alert>

				<Button asChild variant="outline" className="w-full">
					<Link href={dashboardHref}>
						<Home className="size-4 mr-2" />
						Back to Dashboard
					</Link>
				</Button>
			</div>
		</section>
	)
}
