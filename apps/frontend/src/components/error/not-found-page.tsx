import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Search, ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
			<div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-xl md:p-12 dark:bg-slate-800">
				<div className="flex flex-col items-center space-y-6 text-center">
					<div className="relative">
<<<<<<< HEAD
						<div className="select-none text-[120px] font-bold text-slate-200 md:text-[180px] dark:text-slate-700">
=======
						<div className="text-[120px] font-bold text-slate-200 select-none md:text-[180px] dark:text-slate-700">
>>>>>>> origin/main
							404
						</div>
						<div className="absolute inset-0 flex items-center justify-center">
							<Search className="h-20 w-20 text-slate-400 md:h-24 md:w-24 dark:text-slate-500" />
						</div>
					</div>

					<div className="space-y-3">
						<h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
							Page Not Found
						</h1>
						<p className="max-w-md text-lg text-slate-600 dark:text-slate-400">
							The page you&apos;re looking for doesn&apos;t exist
							or has been moved. Let&apos;s get you back on track.
						</p>
					</div>

					<div className="flex flex-col gap-3 pt-4 sm:flex-row">
						<Link href="/">
							<Button className="flex items-center gap-2">
								<Home className="h-4 w-4" />
								Go to Dashboard
							</Button>
						</Link>
						<Button
							onClick={() => window.history.back()}
							variant="outline"
							className="flex items-center gap-2"
						>
							<ArrowLeft className="h-4 w-4" />
							Go Back
						</Button>
					</div>

					<div className="pt-8 text-sm text-slate-500 dark:text-slate-400">
						<p>
							Need help? Contact support at{' '}
							<a
								href="mailto:support@tenantflow.com"
								className="text-primary hover:underline"
							>
								support@tenantflow.com
							</a>
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
