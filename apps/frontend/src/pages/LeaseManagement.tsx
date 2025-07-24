import { AlertTriangle } from 'lucide-react'

export default function LeaseManagement() {
	// TEMPORARILY DISABLED: Complex TypeScript type mismatches need resolution
	// See GitHub issue #80 for LeaseManagement TypeScript fixes
	return (
		<div className="container mx-auto py-8">
			<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
				<div className="flex items-center">
					<AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
					<h2 className="text-lg font-semibold text-yellow-800">Feature Temporarily Unavailable</h2>
				</div>
				<p className="mt-2 text-yellow-700">
					Lease Management is temporarily disabled while we resolve TypeScript compatibility issues. 
					This feature will be restored in an upcoming update.
				</p>
				<p className="mt-2 text-sm text-yellow-600">
					In the meantime, you can still manage tenants and properties from their respective pages.
				</p>
			</div>
		</div>
	)
}