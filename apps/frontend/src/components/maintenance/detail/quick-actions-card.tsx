'use client'

import { Button } from '#components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Edit2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface QuickActionsCardProps {
	maintenanceId: string
}

export function QuickActionsCard({ maintenanceId }: QuickActionsCardProps) {
	const router = useRouter()

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Quick Actions</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				<Button
					variant="outline"
					className="w-full justify-start gap-2"
					onClick={() => router.push(`/maintenance/${maintenanceId}/edit`)}
				>
					<Edit2 className="size-4" />
					Edit Request
				</Button>
				<Button
					variant="outline"
					className="w-full justify-start gap-2 text-destructive hover:text-destructive"
					onClick={() => toast.info('Delete functionality coming soon')}
				>
					<Trash2 className="size-4" />
					Delete Request
				</Button>
			</CardContent>
		</Card>
	)
}
