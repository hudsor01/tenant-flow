'use client'

import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { PRIORITY, type Priority } from '@repo/shared'

interface PrioritySelectorProps {
	value?: Priority
	onValueChange: (_value: Priority) => void
	error?: string
}

export function PrioritySelector({
	value,
	onValueChange,
	error
}: PrioritySelectorProps) {
	const getPriorityIndicator = (priority: string) => {
		switch (priority) {
			case 'LOW':
				return (
					<div className="mr-2 h-2 w-2 rounded-full bg-green-5" />
				)
			case 'MEDIUM':
				return (
					<div className="mr-2 h-2 w-2 rounded-full bg-yellow-5" />
				)
			case 'HIGH':
				return (
					<div className="mr-2 h-2 w-2 rounded-full bg-orange-5" />
				)
			case 'EMERGENCY':
				return <i className="i-lucide-alert-triangle mr-2 h-4 w-4 text-red-5"  />
			default:
				return <div className="mr-2 h-2 w-2 rounded-full bg-gray-5" />
		}
	}

	const getPriorityLabel = (priority: string) => {
		switch (priority) {
			case 'LOW':
				return 'Low - Can wait a few days'
			case 'MEDIUM':
				return 'Medium - Address soon'
			case 'HIGH':
				return 'High - Needs quick attention'
			case 'EMERGENCY':
				return 'Emergency - Immediate attention'
			default:
				return 'Medium - Address soon'
		}
	}

	return (
		<div className="space-y-2">
			<Label htmlFor="priority">Priority</Label>
			<Select value={value} onValueChange={onValueChange}>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select priority level" />
				</SelectTrigger>
				<SelectContent>
					{Object.entries(PRIORITY).map(([key, priorityValue]) => (
						<SelectItem key={key} value={priorityValue}>
							<div className="flex items-center">
								{getPriorityIndicator(priorityValue)}
								{getPriorityLabel(priorityValue)}
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{error && <p className="text-destructive text-sm">{error}</p>}
		</div>
	)
}
