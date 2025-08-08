interface ErrorDisplayProps {
  error: string | null
  className?: string
}

export function ErrorDisplay({ error, className }: ErrorDisplayProps) {
  if (!error) return null

  return (
    <div className={`bg-destructive/10 border border-destructive/20 rounded-md p-3 ${className || ''}`}>
      <p className="text-destructive text-sm">{error}</p>
    </div>
  )
}