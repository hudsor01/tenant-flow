import type { WebVitalData } from '@repo/shared'
import { createLogger } from '@repo/shared'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const logger = createLogger({ component: 'WebVitalsAPI' })

export async function POST(request: NextRequest) {
	try {
		const data: WebVitalData = await request.json()

		// Validate required fields
		if (!data.name || typeof data.value !== 'number' || !data.page) {
			return NextResponse.json(
				{ error: 'Invalid web vitals data' },
				{ status: 400 }
			)
		}

		// Log web vitals data for monitoring
		logger.info('Web Vitals collected', {
			action: 'web_vitals_collected',
			metadata: {
				metric: data.name,
				value: data.value,
				rating: data.rating,
				page: data.page,
				timestamp: data.timestamp
			}
		})

		return NextResponse.json({ success: true }, { status: 200 })
	} catch (error) {
		logger.error('Web vitals endpoint error', {
			action: 'web_vitals_endpoint_error',
			metadata: {
				error: error instanceof Error ? error.message : String(error)
			}
		})
		return NextResponse.json(
			{ error: 'Failed to process web vitals data' },
			{ status: 500 }
		)
	}
}

export async function OPTIONS() {
	return NextResponse.json({}, { status: 200 })
}
