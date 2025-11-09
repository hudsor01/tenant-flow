/**
 * Toggle Switch Component
 * Reusable toggle switch combining shadcn/ui Switch + Label components
 * Based on shadcn/ui documentation: https://ui.shadcn.com/docs/components/switch
 */

import type { LucideIcon } from 'lucide-react'
import { Label } from '#components/ui/label'
import { Switch } from '#components/ui/switch'

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
	const id = `toggle-${label.toLowerCase().replace(/\s+/g, '-')}`

	return (
		<div className="flex items-center justify-between p-4 border rounded-lg">
			<div className="flex items-center gap-3">
				<Icon className="size-5 text-accent-main" />
				<div>
					<Label htmlFor={id} className="font-medium cursor-pointer">
						{label}
					</Label>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>
			</div>
			<Switch
				id={id}
				checked={checked}
				onCheckedChange={onChange}
				disabled={disabled}
			/>
		</div>
	)
}
