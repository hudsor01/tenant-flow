/**
 * Colocated UI State Hook - Pagination Pattern
 * Manages pagination state for tables and lists
 */

import { useCallback, useMemo, useState } from 'react'

interface UsePaginationProps {
	initialPage?: number
	pageSize?: number
	totalItems: number
}

interface UsePaginationReturn {
	currentPage: number
	pageSize: number
	totalPages: number
	hasNextPage: boolean
	hasPreviousPage: boolean
	nextPage: () => void
	previousPage: () => void
	goToPage: (page: number) => void
	setPageSize: (size: number) => void
	startIndex: number
	endIndex: number
}

/**
 * Hook for managing pagination state
 * Common use cases: data tables, infinite scroll, list pagination
 *
 * Example:
 * const pagination = usePagination({ totalItems: 100, pageSize: 10 })
 * const paginatedData = data.slice(pagination.startIndex, pagination.endIndex)
 */
export function usePagination({
	initialPage = 1,
	pageSize: initialPageSize = 10,
	totalItems
}: UsePaginationProps): UsePaginationReturn {
	const [currentPage, setCurrentPage] = useState(initialPage)
	const [pageSize, setPageSize] = useState(initialPageSize)

	const totalPages = useMemo(() => {
		return Math.ceil(totalItems / pageSize)
	}, [totalItems, pageSize])

	const hasNextPage = useMemo(() => {
		return currentPage < totalPages
	}, [currentPage, totalPages])

	const hasPreviousPage = useMemo(() => {
		return currentPage > 1
	}, [currentPage])

	const startIndex = useMemo(() => {
		return (currentPage - 1) * pageSize
	}, [currentPage, pageSize])

	const endIndex = useMemo(() => {
		return Math.min(startIndex + pageSize, totalItems)
	}, [startIndex, pageSize, totalItems])

	const nextPage = useCallback(() => {
		setCurrentPage(prev => Math.min(prev + 1, totalPages))
	}, [totalPages])

	const previousPage = useCallback(() => {
		setCurrentPage(prev => Math.max(prev - 1, 1))
	}, [])

	const goToPage = useCallback(
		(page: number) => {
			setCurrentPage(Math.max(1, Math.min(page, totalPages)))
		},
		[totalPages]
	)

	const handleSetPageSize = useCallback((size: number) => {
		setPageSize(size)
		setCurrentPage(1) // Reset to first page when page size changes
	}, [])

	return {
		currentPage,
		pageSize,
		totalPages,
		hasNextPage,
		hasPreviousPage,
		nextPage,
		previousPage,
		goToPage,
		setPageSize: handleSetPageSize,
		startIndex,
		endIndex
	}
}
