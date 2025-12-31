'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { quickActions, type QuickActionType } from '../dashboard-types'

interface QuickActionsCardProps {
	onAction: (action: QuickActionType) => void
}

export function QuickActionsCard({ onAction }: QuickActionsCardProps) {
	return (
		<Card data-tour="quick-actions">
			<CardHeader>
				<CardTitle>Quick Actions</CardTitle>
				<CardDescription>Common tasks</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-3">
				{quickActions.map(action => (
					<button
						key={action.action}
						className="flex h-auto items-center gap-3 p-3 text-left border border-border rounded-lg hover:bg-muted/50 transition-colors"
						onClick={() => onAction(action.action)}
					>
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
							<action.icon className="h-4 w-4" />
						</div>
						<div>
							<div className="text-sm font-medium">{action.title}</div>
							<div className="text-xs text-muted-foreground">
								{action.description}
							</div>
						</div>
					</button>
				))}
			</CardContent>
		</Card>
	)
}
