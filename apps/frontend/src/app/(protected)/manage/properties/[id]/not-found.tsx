'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'
import Link from 'next/link'

export default function PropertyNotFound() {
	return (
		<main role="main" className="flex min-h-[400px] items-center justify-center p-8">
			<div className="max-w-md w-full space-y-4">
				<Alert variant="destructive">
					<AlertTitle>Property not found</AlertTitle>
					<AlertDescription>
						The property you're looking for does not exist or has been removed.
					</AlertDescription>
				</Alert>

				<Button asChild variant="outline" className="w-full">
					<Link href="/manage/properties">
						<Home className="size-4 mr-2" />
						Back to Properties
					</Link>
				</Button>
			</div>
		</main>
	)
}
