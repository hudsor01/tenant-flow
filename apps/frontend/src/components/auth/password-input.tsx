import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PasswordInputProps {
	id: string
	label: string
	placeholder: string
	value: string
	showPassword: boolean
	onValueChange: (_value: string) => void
	onToggleVisibility: () => void
	required?: boolean
	disabled?: boolean
	error?: string | null
}

export function PasswordInput({
	id,
	label,
	placeholder,
	value,
	showPassword,
	onValueChange,
	onToggleVisibility,
	required = false,
	disabled = false,
	error
}: PasswordInputProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<div className="relative">
				<Input
					id={id}
					type={showPassword ? 'text' : 'password'}
					placeholder={placeholder}
					value={value}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => onValueChange(e.target.value)}
					required={required}
					disabled={disabled}
					className="h-11 pr-10"
				/>
				<button
					type="button"
					onClick={onToggleVisibility}
					className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
					tabIndex={-1}
				>
					{showPassword ? (
						<EyeOff className="h-4 w-4" />
					) : (
						<Eye className="h-4 w-4" />
					)}
				</button>
			</div>
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	)
}
