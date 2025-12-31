'use client'

import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { User } from 'lucide-react'

interface ContactInfoCardProps {
	requestedBy?: string | null
	assignedTo?: string | null
}

export function ContactInfoCard({
	requestedBy,
	assignedTo
}: ContactInfoCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Contact Information</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{requestedBy && (
					<div className="flex items-start gap-3">
						<div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<User className="size-4 text-primary" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Requested by</p>
							<p className="font-medium text-sm">{requestedBy}</p>
						</div>
					</div>
				)}
				{assignedTo && (
					<div className="flex items-start gap-3">
						<div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<User className="size-4 text-primary" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Assigned to</p>
							<p className="font-medium text-sm">{assignedTo}</p>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
