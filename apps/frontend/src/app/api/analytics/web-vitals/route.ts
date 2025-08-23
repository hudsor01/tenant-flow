import { type NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// Minimal web vitals tracking - let Vercel Analytics handle this natively
export async function POST(request: NextRequest) {
	try {
		const payload = await request.json()

		// Basic validation
		if (!payload.name || !payload.value) {
			return NextResponse.json(
				{ error: 'Invalid payload' },
				{ status: 400 }
			)
		}

		// Only log poor performance in production
		if (
			process.env.NODE_ENV === 'production' &&
			payload.rating === 'poor'
		) {
			console.warn(`Poor ${payload.name}: ${payload.value}ms`)
		}

		return NextResponse.json({ success: true })
	} catch {
		return NextResponse.json({ error: 'Server error' }, { status: 500 })
	}
}
