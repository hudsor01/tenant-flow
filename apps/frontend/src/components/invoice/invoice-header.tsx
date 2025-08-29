
export function InvoiceHeader() {
	return (
		<div className="mb-12 text-center">
			{/* Logo and Branding */}
			<div className="mb-6 flex items-center justify-center gap-4">
				<div className="relative">
					<div className="from-primary flex h-16 w-16 transform items-center justify-center rounded-2xl bg-gradient-to-r to-indigo-600 shadow-lg transition-transform duration-200 hover:scale-105">
						<i className="i-lucide-calculator h-8 w-8 text-white"  />
					</div>
					<div className="bg-primary absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full" />
				</div>
				<div className="text-left">
					<h1 className="mb-2 font-serif text-5xl font-bold text-white">
						Invoice Generator
					</h1>
					<p className="text-lg text-blue-2">
						by{' '}
						<span className="font-semibold text-blue-3">
							TenantFlow
						</span>
					</p>
				</div>
			</div>

			{/* Marketing-focused subtitle */}
			<div className="mx-auto max-w-3xl">
				<p className="mb-4 text-xl font-light leading-relaxed text-blue-1/90">
					Create professional invoices that get paid faster. Beautiful
					design meets powerful functionality.
				</p>
				<div className="flex flex-wrap items-center justify-center gap-6 text-sm text-blue-2">
					<div className="flex items-center gap-2">
						<i className="i-lucide-checkcircle h-4 w-4 text-green-4"  />
						<span>Instant PDF Generation</span>
					</div>
					<div className="flex items-center gap-2">
						<i className="i-lucide-checkcircle h-4 w-4 text-green-4"  />
						<span>Auto Tax Calculation</span>
					</div>
					<div className="flex items-center gap-2">
						<i className="i-lucide-checkcircle h-4 w-4 text-green-4"  />
						<span>Professional Templates</span>
					</div>
				</div>
			</div>
		</div>
	)
}
