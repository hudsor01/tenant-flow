import fetch, { type RequestInit } from 'node-fetch'
import { performance } from 'perf_hooks'

// Minimal list of RPCs to validate — adjust as needed
const RPCS = [
	'get_property_stats',
	'get_property_performance',
	'get_property_units',
	'get_unit_statistics',
	'calculate_visitor_analytics_full',
	'get_occupancy_trends',
	'get_vacancy_analysis',
	'get_occupancy_overview',
	'calculate_maintenance_metrics',
	'get_maintenance_analytics',
	'get_lease_financial_summary',
	'get_leases_with_financial_analytics',
	'get_lease_lifecycle_data',
	'get_lease_status_breakdown'
]

const timeoutMs = 8000

type RpcResult =
	| {
			rpcName: string
			ok: true
			status: number
			duration: number
			body: string
	  }
	| {
			rpcName: string
			ok: false
			status: number | 'error'
			duration: number
			error: string
			body?: string
	  }

async function callRpc(rpcName: string): Promise<RpcResult> {
	const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/${rpcName}`
	const options: RequestInit = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			apikey: process.env.SUPABASE_ANON_KEY || '',
			Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
		},
		body: JSON.stringify({ p_user_id: process.env.TEST_USER_ID || null })
	}

	const start = performance.now()
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)
	try {
		const res = await fetch(url, { ...options, signal: controller.signal })
		const duration = performance.now() - start
		const text = await res.text()
		return {
			rpcName,
			ok: res.ok,
			status: res.status,
			duration: Math.round(duration),
			body: text
		}
	} catch (error) {
		const duration = Math.round(performance.now() - start)
		const message = error instanceof Error ? error.message : 'Unknown error'
		return { rpcName, ok: false, status: 'error', duration, error: message }
	} finally {
		clearTimeout(timer)
	}
}

async function main() {
	if (!process.env.SUPABASE_URL) {
		console.error('SUPABASE_URL not set')
		process.exit(2)
	}
	console.log('Testing RPCs against', process.env.SUPABASE_URL)
	for (const r of RPCS) {
		const result = await callRpc(r)
		console.log(JSON.stringify(result))
	}
}

main().catch(e => {
	console.error(e)
	process.exit(1)
})
