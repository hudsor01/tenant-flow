import { Calculator, CheckCircle } from 'lucide-react'

export function InvoiceHeader() {
	return (
		<div className="mb-12 text-center">
			{/* Logo and Branding */}
			<div className="mb-6 flex items-center justify-center gap-4">
				<div className="relative">
					<div className="bg-gradient-to-r from-blue-600 to-indigo-600 flex h-16 w-16 transform items-center justify-center rounded-2xl shadow-lg transition-transform duration-200 hover:scale-105">
						<Calculator className="text-white h-8 w-8" />
					</div>
					<div className="bg-blue-500 absolute -top-1 -right-1 h-4 w-4 animate-pulse rounded-full"></div>
				</div>
				<div className="text-left">
					<h1 className="text-white mb-2 font-serif text-5xl font-bold">
						Invoice Generator
					</h1>
					<p className="text-blue-200 text-lg">
						by{' '}
						<span className="text-blue-300 font-semibold">
							TenantFlow
						</span>
					</p>
				</div>
			</div>

			{/* Marketing-focused subtitle */}
			<div className="mx-auto max-w-3xl">
				<p className="text-blue-100/90 mb-4 text-xl leading-relaxed font-light">
					Create professional invoices that get paid faster. Beautiful
					design meets powerful functionality.
				</p>
				<div className="text-blue-200 flex flex-wrap items-center justify-center gap-6 text-sm">
					<div className="flex items-center gap-2">
						<CheckCircle className="text-green-400 h-4 w-4" />
						<span>Instant PDF Generation</span>
					</div>
					<div className="flex items-center gap-2">
						<CheckCircle className="text-green-400 h-4 w-4" />
						<span>Auto Tax Calculation</span>
					</div>
					<div className="flex items-center gap-2">
						<CheckCircle className="text-green-400 h-4 w-4" />
						<span>Professional Templates</span>
					</div>
				</div>
			</div>
		</div>
	)
}
