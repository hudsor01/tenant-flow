import { AlertCircle } from 'lucide-react'
import type { BaseComponentProps } from '@/types'

interface AuthErrorProps extends BaseComponentProps {
	message: string
	type?: 'error' | 'warning'
}

export function AuthError({ message, type = 'error' }: AuthErrorProps) {
	const bgClass = type === 'error' ? 'bg-destructive/10' : 'bg-yellow-50'
	const borderClass =
		type === 'error' ? 'border-destructive/20' : 'border-yellow-200'
	const textClass = type === 'error' ? 'text-destructive' : 'text-yellow-800'
	const iconClass = type === 'error' ? 'text-destructive' : 'text-yellow-600'

	return (
		<div className={`${bgClass} ${borderClass} rounded-md border p-3`}>
			<div className="flex items-center gap-2">
				<AlertCircle className={`h-4 w-4 ${iconClass}`} />
				<p className={`text-sm ${textClass}`}>{message}</p>
			</div>
		</div>
	)
}
