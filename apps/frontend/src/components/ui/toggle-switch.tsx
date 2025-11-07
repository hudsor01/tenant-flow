/**
 * Toggle Switch Component
 * Reusable toggle switch UI for notification preferences and settings
 */

import type { LucideIcon } from 'lucide-react'

interface ToggleSwitchProps {
	icon: LucideIcon
	label: string
	description: string
	checked: boolean
	disabled?: boolean
	onChange: (checked: boolean) => void
}

export function ToggleSwitch({
	icon: Icon,
	label,
	description,
	checked,
	disabled = false,
	onChange
}: ToggleSwitchProps) {
	return (
		<div className="flex items-center justify-between p-4 border rounded-lg">
			<div className="flex items-center gap-3">
				<Icon className="size-5 text-accent-main" />
				<div>
					<p className="font-medium">{label}</p>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>
			</div>
			<label className="relative inline-flex items-center cursor-pointer">
				<input
					type="checkbox"
					className="sr-only peer"
					checked={checked}
					onChange={e => onChange(e.target.checked)}
					disabled={disabled}
				/>
				<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-main/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-main peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
			</label>
		</div>
	)
}
