import { MessageCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { PageLayout } from '@/components/layout/page-layout'

function CancelContent() {
	return (
		<PageLayout 
			showNavbar={false} 
			className="bg-gradient-to-br from-red-50 to-orange-100" 
			containerClass="flex items-center justify-center min-h-screen max-w-md"
		>
			<div className="w-full bg-white rounded-2xl shadow-xl p-8 text-center">
				<div className="mb-6">
					<XCircle className="mx-auto h-16 w-16 text-red-500" />
				</div>

				<h1 className="text-3xl font-bold text-gray-900 mb-4">
					Payment Cancelled
				</h1>

				<p className="text-gray-600 mb-8">
					Your payment was cancelled and no charges have been made to your
					account. You can try again whenever you're ready.
				</p>

				<div className="space-y-4">
					<Link
						href="/pricing"
						className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
					>
						Try Again
					</Link>

					<Link
						href="/"
						className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
					>
						Back to Home
					</Link>
				</div>

				<div className="mt-8 pt-6 border-t border-gray-200">
					<div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
						<MessageCircle className="w-4 h-4" />
						<span>Need help? Contact our support team</span>
					</div>
				</div>
			</div>
		</PageLayout>
	)
}

export default function CancelPage() {
	return (
		<Suspense
			fallback={
				<PageLayout 
					showNavbar={false} 
					className="bg-gradient-to-br from-red-50 to-orange-100" 
					containerClass="flex items-center justify-center min-h-screen"
				>
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
				</PageLayout>
			}
		>
			<CancelContent />
		</Suspense>
	)
}
