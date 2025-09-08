import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function SuccessContent() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
			<div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
				<div className="mb-6">
					<CheckCircle className="mx-auto h-16 w-16 text-green-500" />
				</div>

				<h1 className="text-3xl font-bold text-gray-900 mb-4">
					Welcome to TenantFlow!
				</h1>

				<p className="text-gray-600 mb-8">
					Your subscription has been activated successfully. You now have access
					to all premium features.
				</p>

				<div className="space-y-4">
					<Link
						href="/dashboard"
						className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
					>
						Go to Dashboard
					</Link>

					<Link
						href="/"
						className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
					>
						Back to Home
					</Link>
				</div>

				<div className="mt-8 pt-6 border-t border-gray-200">
					<p className="text-sm text-gray-500">
						A confirmation email has been sent to your inbox with your receipt
						and account details.
					</p>
				</div>
			</div>
		</div>
	)
}

export default function SuccessPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
				</div>
			}
		>
			<SuccessContent />
		</Suspense>
	)
}
