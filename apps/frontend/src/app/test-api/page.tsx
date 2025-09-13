'use client'

import { NumberTicker } from '@/components/magicui/number-ticker'
import { Check, Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface TestDashboardStats {
	totalProperties: number
	totalUnits: number
	totalTenants: number
	totalRevenue: number
	occupancyRate: number
	maintenanceRequests: number
}

export default function TestApiPage() {
	const [stats, setStats] = useState<TestDashboardStats | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchStats = async () => {
			try {
				setLoading(true)
				// Call via proxy in both development and production
				// Development: Next.js API route proxies to api.tenantflow.app
				// Production: Vercel rewrite proxies to api.tenantflow.app
				const response = await fetch('/api/v1/dashboard/stats')
				
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`)
				}

				const result = await response.json()
				
				if (!result.success) {
					throw new Error(result.error || 'API call failed')
				}
				
				setStats(result.data)
				setError(null)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Unknown error')
				console.error('API Error:', err)
			} finally {
				setLoading(false)
			}
		}

		fetchStats()
	}, [])

	return (
  <div className="min-h-screen bg-background card-padding">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-4xl font-bold mb-8 text-center">
					Direct API Integration Test
				</h1>

				<div className="mb-6 p-4 bg-muted rounded-lg">
					<h2 className="font-semibold mb-2">API Status:</h2>
					<div
						className={`text-sm flex items-center gap-2 ${loading ? 'text-yellow-600' : error ? 'text-red-600' : 'text-green-600'}`}
					>
						{loading ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								<span>Loading...</span>
							</>
						) : error ? (
							<>
								<X className="w-4 h-4" />
								<span>Error: {error}</span>
							</>
						) : (
							<>
								<Check className="w-4 h-4" />
								<span>Success</span>
							</>
						)}
					</div>
				</div>

				{loading && (
					<div className="text-center py-8">
						<p className="text-lg">Fetching dashboard stats...</p>
					</div>
				)}

				{error && (
					<div className="text-center py-8">
						<div className="bg-red-50 border border-red-200 rounded-lg p-6">
							<h3 className="text-red-800 font-semibold mb-2">API Error</h3>
							<p className="text-red-600">{error}</p>
							<div className="mt-4 text-sm text-red-500">
								<p>Production: /api/v1/dashboard/stats → https://api.tenantflow.app/api/v1/dashboard/stats</p>
								<p>Development: http://localhost:4600/api/v1/dashboard/stats</p>
								<p>Using Vercel rewrite proxy in production environment</p>
							</div>
						</div>
					</div>
				)}

				{stats && (
					<>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
							<div className="bg-card p-6 rounded-lg border text-center">
								<h2 className="text-lg font-semibold mb-2">Properties</h2>
								<div className="text-3xl font-bold text-blue-600">
									<NumberTicker value={stats.totalProperties} />
								</div>
							</div>

							<div className="bg-card p-6 rounded-lg border text-center">
								<h2 className="text-lg font-semibold mb-2">Tenants</h2>
								<div className="text-3xl font-bold text-green-600">
									<NumberTicker value={stats.totalTenants} />
								</div>
							</div>

							<div className="bg-card p-6 rounded-lg border text-center">
								<h2 className="text-lg font-semibold mb-2">Occupancy Rate</h2>
								<div className="text-3xl font-bold text-purple-600">
									<NumberTicker value={Math.round(stats.occupancyRate)} />%
								</div>
							</div>

							<div className="bg-card p-6 rounded-lg border text-center">
								<h2 className="text-lg font-semibold mb-2">Units</h2>
								<div className="text-3xl font-bold text-orange-600">
									<NumberTicker value={stats.totalUnits} />
								</div>
							</div>

							<div className="bg-card p-6 rounded-lg border text-center">
								<h2 className="text-lg font-semibold mb-2">Revenue</h2>
								<div className="text-3xl font-bold text-emerald-600">
									$<NumberTicker value={Math.round(stats.totalRevenue)} />
								</div>
							</div>

							<div className="bg-card p-6 rounded-lg border text-center">
								<h2 className="text-lg font-semibold mb-2">Maintenance</h2>
								<div className="text-3xl font-bold text-red-600">
									<NumberTicker value={stats.maintenanceRequests} />
								</div>
							</div>
						</div>

						<div className="bg-muted rounded-lg p-4">
							<h3 className="font-semibold mb-2">Raw API Response:</h3>
							<pre className="text-sm overflow-x-auto">
								{JSON.stringify(stats, null, 2)}
							</pre>
						</div>
					</>
				)}

				<div className="mt-8 text-center">
					<p className="text-sm text-muted-foreground">
						Testing production architecture: Frontend → Vercel Proxy → api.tenantflow.app
					</p>
					<p className="text-xs text-muted-foreground mt-1">
						Development uses direct connection to localhost:4600
					</p>
				</div>
			</div>
		</div>
	)
}
