import type { BaseProps } from '@repo/shared/types/ui'

interface AuthErrorProps extends BaseProps {
	message: string
	type?: 'error' | 'warning'
}

export function AuthError({ message, type = 'error' }: AuthErrorProps) {
	const bgClass = type === 'error' ? 'bg-destructive/10' : 'bg-yellow-1'
	const borderClass =
		type === 'error' ? 'border-destructive/20' : 'border-yellow-2'
	const textClass = type === 'error' ? 'text-destructive' : 'text-yellow-8'
	const iconClass = type === 'error' ? 'text-destructive' : 'text-yellow-6'

	return (
		<div className={`${bgClass} ${borderClass} rounded-md border p-3`}>
			<div className="flex items-center gap-2">
				<i className={`i-lucide-alert-circle h-4 w-4 ${iconClass}`} />
				<p className={`text-sm ${textClass}`}>{message}</p>
			</div>
		</div>
	)
}
