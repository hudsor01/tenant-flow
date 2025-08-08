import { CheckCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils/css.utils'
import type { PasswordStrength } from '@/hooks/use-password-validation'

interface PasswordStrengthIndicatorProps {
  password: string
  passwordStrength: PasswordStrength
  className?: string
}

export function PasswordStrengthIndicator({ 
  password, 
  passwordStrength, 
  className 
}: PasswordStrengthIndicatorProps) {
  if (!password) return null

  const requirements = [
    { key: 'hasMinLength', label: '8+ characters' },
    { key: 'hasUpperCase', label: 'Uppercase' },
    { key: 'hasNumber', label: 'Number' }
  ] as const

  return (
    <div className={cn("space-y-2 text-xs", className)}>
      <div className="flex flex-wrap gap-2">
        {requirements.map(({ key, label }) => {
          const isValid = passwordStrength[key]
          return (
            <span
              key={key}
              className={cn(
                "flex items-center gap-1",
                isValid ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {isValid ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {label}
            </span>
          )
        })}
      </div>
    </div>
  )
}