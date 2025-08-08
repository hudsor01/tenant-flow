/**
 * Pagination - Server Component
 * 
 * Server component for SEO-friendly pagination.
 * Uses semantic HTML structure for accessibility.
 */

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  showPrevNext?: boolean
  maxVisible?: number
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  maxVisible = 7,
  className
}: PaginationProps) {
  const getVisiblePages = React.useMemo(() => {
    const delta = Math.floor(maxVisible / 2)
    const range = []
    const rangeWithDots = []

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }, [currentPage, totalPages, maxVisible])

  const pages = totalPages > 1 ? getVisiblePages : []

  if (totalPages <= 1) return null

  return (
    <nav className={cn("flex items-center justify-center space-x-1", className)}>
      {showFirstLast && currentPage > 1 && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          aria-label="Go to first page"
        >
          «
        </Button>
      )}

      {showPrevNext && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Go to previous page"
        >
          ‹
        </Button>
      )}

      {pages.map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <span className="px-3 py-2 text-muted-foreground">...</span>
          ) : (
            <Button
              variant={page === currentPage ? 'default' : 'outline'}
              size="icon"
              onClick={() => typeof page === 'number' && onPageChange(page)}
              aria-label={`Go to page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </Button>
          )}
        </React.Fragment>
      ))}

      {showPrevNext && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Go to next page"
        >
          ›
        </Button>
      )}

      {showFirstLast && currentPage < totalPages && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          aria-label="Go to last page"
        >
          »
        </Button>
      )}
    </nav>
  )
}