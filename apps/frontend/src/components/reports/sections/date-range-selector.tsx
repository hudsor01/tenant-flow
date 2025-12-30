'use client'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Input } from '#components/ui/input'
import { Calendar } from 'lucide-react'

interface DateRangeSelectorProps {
	startDate: string
	endDate: string
	onStartDateChange: (date: string) => void
	onEndDateChange: (date: string) => void
	onReset: () => void
}

export function DateRangeSelector({
	startDate,
	endDate,
	onStartDateChange,
	onEndDateChange,
	onReset
}: DateRangeSelectorProps) {
	return (
		<Card className="mb-6">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Calendar className="size-5" />
					Date Range
				</CardTitle>
				<CardDescription>
					Use a custom window for report generation
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
				<div className="flex flex-col gap-2">
					<label className="text-sm text-muted-foreground" htmlFor="start">
						Start date
					</label>
					<Input
						id="start"
						type="date"
						value={startDate}
						onChange={event => onStartDateChange(event.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-sm text-muted-foreground" htmlFor="end">
						End date
					</label>
					<Input
						id="end"
						type="date"
						value={endDate}
						onChange={event => onEndDateChange(event.target.value)}
					/>
				</div>
				<Button variant="outline" onClick={onReset}>
					Reset to last 90 days
				</Button>
			</CardContent>
		</Card>
	)
}
