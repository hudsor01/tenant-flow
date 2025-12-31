'use client'

import * as React from 'react'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '#components/ui/dialog'
import { Field, FieldLabel } from '#components/ui/field'
import { useMaintenanceRequestUpdateMutation } from '#hooks/api/mutations/maintenance-mutations'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { Calendar } from 'lucide-react'
import { toast } from 'sonner'

const logger = createLogger({ component: 'ScheduleDialog' })

interface ScheduleDialogProps {
	maintenanceId: string
	currentDate?: string | null | undefined
	onSuccess: () => void
}

export function ScheduleDialog({
	maintenanceId,
	currentDate,
	onSuccess
}: ScheduleDialogProps) {
	const [open, setOpen] = React.useState(false)
	const updateMutation = useMaintenanceRequestUpdateMutation()
	const [scheduledDate, setScheduledDate] = React.useState(
		currentDate ? new Date(currentDate).toISOString().split('T')[0] : ''
	)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!scheduledDate) {
			toast.error('Please select a date')
			return
		}

		try {
			await updateMutation.mutateAsync({
				id: maintenanceId,
				data: { scheduled_date: scheduledDate }
			})
			setOpen(false)
			onSuccess()
		} catch (error) {
			logger.error('Failed to schedule work', { error })
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1.5">
					<Calendar className="size-4" />
					{currentDate ? 'Reschedule' : 'Schedule'}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Schedule Work</DialogTitle>
					<DialogDescription>
						Select a date to schedule this maintenance work.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<Field>
						<FieldLabel htmlFor="schedule_date">Date *</FieldLabel>
						<Input
							id="schedule_date"
							type="date"
							value={scheduledDate}
							onChange={e => setScheduledDate(e.target.value)}
							min={new Date().toISOString().split('T')[0]}
							required
						/>
					</Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending ? 'Saving...' : 'Save'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
