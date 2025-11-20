import type { OccupancyTrendResponse } from '@repo/shared/types/database-rpc'
import type { NextRequest } from 'next/server'

/**
 * GET /api/occupancy-trends
 * Returns mock occupancy trend data for the dashboard
 */
export async function GET(_request: NextRequest) {
	try {
		// Return empty array as placeholder
		// In production, this would fetch from the backend or database
		const data: OccupancyTrendResponse[] = []

		return Response.json({ data }, { status: 200 })
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error'

		return Response.json(
			{ error: 'Failed to fetch occupancy trends', message },
			{ status: 500 }
		)
	}
}
