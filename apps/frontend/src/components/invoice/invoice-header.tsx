import { Calculator, CheckCircle } from 'lucide-react'

export function InvoiceHeader() {
	return (
		<div className="mb-12 text-center">
			{/* Logo and Branding */}
			<div className="mb-6 flex items-center justify-center gap-4">
				<div className="relative">
					<div className="from-primary flex h-16 w-16 transform items-center justify-center rounded-2xl bg-gradient-to-r to-indigo-600 shadow-lg transition-transform duration-200 hover:scale-105">
						<Calculator className="h-8 w-8 text-white" />
					</div>
<<<<<<< HEAD
					<div className="bg-primary absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full" />
=======
					<div className="bg-primary absolute -top-1 -right-1 h-4 w-4 animate-pulse rounded-full"></div>
>>>>>>> origin/main
				</div>
				<div className="text-left">
					<h1 className="mb-2 font-serif text-5xl font-bold text-white">
						Invoice Generator
					</h1>
					<p className="text-lg text-blue-200">
						by{' '}
						<span className="font-semibold text-blue-300">
							TenantFlow
						</span>
					</p>
				</div>
			</div>

			{/* Marketing-focused subtitle */}
			<div className="mx-auto max-w-3xl">
<<<<<<< HEAD
				<p className="mb-4 text-xl font-light leading-relaxed text-blue-100/90">
=======
				<p className="mb-4 text-xl leading-relaxed font-light text-blue-100/90">
>>>>>>> origin/main
					Create professional invoices that get paid faster. Beautiful
					design meets powerful functionality.
				</p>
				<div className="flex flex-wrap items-center justify-center gap-6 text-sm text-blue-200">
					<div className="flex items-center gap-2">
						<CheckCircle className="h-4 w-4 text-green-400" />
						<span>Instant PDF Generation</span>
					</div>
					<div className="flex items-center gap-2">
						<CheckCircle className="h-4 w-4 text-green-400" />
						<span>Auto Tax Calculation</span>
					</div>
					<div className="flex items-center gap-2">
						<CheckCircle className="h-4 w-4 text-green-400" />
						<span>Professional Templates</span>
					</div>
				</div>
			</div>
		</div>
	)
}
