import type { ReactNode } from 'react'

interface ShellProps {
  children: ReactNode
  className?: string
}

export function Shell({ children, className = '' }: ShellProps) {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {children}
    </div>
  )
}