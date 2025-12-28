'use client'

import { LogOut } from 'lucide-react'

export interface UserMenuProps {
	user: {
		name: string
		email?: string
		avatarUrl?: string
	}
	onLogout?: () => void
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
	// Get initials from name
	const initials = user.name
		.split(' ')
		.map(n => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

	return (
		<div className="p-3">
			<div className="flex items-center gap-3 px-3 py-2">
				{/* Avatar */}
				{user.avatarUrl ? (
					<img
						src={user.avatarUrl}
						alt={user.name}
						className="w-9 h-9 rounded-full object-cover"
					/>
				) : (
					<div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
						<span className="text-sm font-medium text-primary">{initials}</span>
					</div>
				)}

				{/* User info */}
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-slate-900 dark:text-white truncate">
						{user.name}
					</p>
					{user.email && (
						<p className="text-xs text-slate-500 dark:text-slate-400 truncate">
							{user.email}
						</p>
					)}
				</div>

				{/* Logout button */}
				<button
					onClick={onLogout}
					className="p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
					title="Log out"
				>
					<LogOut className="w-4 h-4" />
				</button>
			</div>
		</div>
	)
}
