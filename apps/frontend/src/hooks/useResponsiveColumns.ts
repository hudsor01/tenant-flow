/**
 * Responsive columns hook
 * Calculates optimal column count based on screen width
 */

import { useState, useEffect } from 'react'

export function useResponsiveColumns(minColumnWidth = 300) {
	const [columnCount, setColumnCount] = useState(1)

	useEffect(() => {
		const calculateColumns = () => {
			const containerWidth = window.innerWidth - 64 // Account for padding
			const maxColumns = Math.floor(containerWidth / minColumnWidth)
			setColumnCount(Math.max(1, maxColumns))
		}

		calculateColumns()
		window.addEventListener('resize', calculateColumns)
		return () => window.removeEventListener('resize', calculateColumns)
	}, [minColumnWidth])

	return {
		columnCount,
		gridTemplateColumns: `repeat(${columnCount}, 1fr)`
	}
}