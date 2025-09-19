'use client'

import { GlobalErrorHandler } from '@/components/error/global-error-handler'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <GlobalErrorHandler error={error} reset={reset} />
}