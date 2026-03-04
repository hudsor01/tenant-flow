import { Switch } from '#components/ui/switch'

type PreferenceRowProps = {
	label: string
	description?: string
	checked: boolean
	disabled?: boolean
	onCheckedChange: (checked: boolean) => void
}

export function PreferenceRow({
	label,
	description,
	checked,
	disabled,
	onCheckedChange
}: PreferenceRowProps) {
	return (
		<div className="flex-between rounded-lg border p-4">
			<div className="space-y-1">
				<p className="font-medium">{label}</p>
				{description ? (
					<p className="text-sm text-muted-foreground">{description}</p>
				) : null}
			</div>
			<Switch
				checked={checked}
				onCheckedChange={onCheckedChange}
				disabled={disabled}
			/>
		</div>
	)
}
