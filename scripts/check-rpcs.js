#!/usr/bin/env node
const { performance } = require('perf_hooks')
const fetch = global.fetch || require('node-fetch')

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

async function callRpc(rpcName) {
	const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/${rpcName}`
	const options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			apikey: process.env.SUPABASE_ANON_KEY || '',
			Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
		},
		body: JSON.stringify({ p_user_id: process.env.TEST_USER_ID || null })
	}

	const start = performance.now()
	try {
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), timeoutMs)
		const res = await fetch(url, { ...options, signal: controller.signal })
		clearTimeout(timer)
		const duration = Math.round(performance.now() - start)
		const text = await res.text()
		return { rpcName, ok: res.ok, status: res.status, duration, body: text }
	} catch (err) {
		const duration = Math.round(performance.now() - start)
		return {
			rpcName,
			ok: false,
			status: 'error',
			duration,
			error: err && err.message
		}
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
