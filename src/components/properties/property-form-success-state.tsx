'use client'

import { CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '#components/ui/button'

export function PropertyFormSuccessState() {
	const router = useRouter()

	return (
		<div className="flex flex-col items-center justify-center space-y-4 text-center">
			<CheckCircle className="size-16 text-success" />
			<h2 className="typography-h3">Property Created!</h2>
			<p className="text-muted-foreground">
				Your property has been successfully added to your portfolio.
			</p>
			<Button onClick={() => router.push('/properties')}>
				Return to Properties
			</Button>
		</div>
	)
}
