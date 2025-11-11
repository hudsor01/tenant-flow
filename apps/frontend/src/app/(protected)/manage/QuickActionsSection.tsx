'use client'

import { QuickActions } from '#components/dashboard/quick-actions'

/**
 * QuickActionsSection - Single Responsibility: Display quick action shortcuts
 *
 * Handles quick actions section layout - QuickActions component manages its own logic
 */
export function QuickActionsSection() {
	return (
		<div className="rounded-premium-lg border-2 border-slate-200/60 bg-linear-to-br from-white via-slate-50/30 to-slate-100/20 shadow-premium transition-all duration-500 hover:shadow-premium-xl hover:border-slate-300/80 dark:border-slate-700/60 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20 dark:hover:border-slate-600/80">
			<div className="border-b-2 border-slate-200/40 bg-linear-to-r from-slate-50/50 via-white to-slate-50/50 px-6 py-6 dark:border-slate-700/40 dark:from-slate-800/50 dark:via-slate-900 dark:to-slate-800/50">
				<h3 className="text-xl font-black bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent dark:from-white dark:via-slate-100 dark:to-white tracking-tight">
					Quick Actions
				</h3>
				<p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">
					Common tasks and shortcuts
				</p>
			</div>
			<div className="p-6">
				<QuickActions />
			</div>
		</div>
	)
}
