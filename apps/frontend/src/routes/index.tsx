import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
	component: () => {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-6xl font-bold mb-4">Property Management</h1>
					<p className="text-xl mb-8">Manage properties, tenants, leases, and maintenance requests with ease.</p>
					<p className="text-lg mb-12">Built for property owners who demand professional-grade tools.</p>
					<div className="flex gap-4 justify-center">
						<a href="/auth/register" className="bg-white text-blue-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
							Get Started Free
						</a>
						<a href="/tools" className="border border-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition">
							Try Tools Free
						</a>
					</div>
					<div className="mt-24">
						<h2 className="text-3xl font-bold mb-4">
							Everything You Need to <span className="text-blue-300">Manage Properties</span>
						</h2>
						<p className="text-lg text-white/80">
							From tenant management to maintenance tracking, we've built the complete toolkit for modern property management.
						</p>
					</div>
				</div>
			</div>
		)
	}
})
