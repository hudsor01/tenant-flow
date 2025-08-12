import React from 'react'
import { cn } from '@/lib/utils'

interface FormContainerProps {
  children: React.ReactNode
  className?: string
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
}

export function FormContainer({ children, className, onSubmit }: FormContainerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn("space-y-6", className)}
    >
      {children}
    </form>
  )
}