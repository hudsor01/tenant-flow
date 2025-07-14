import { Calculator, CheckCircle } from 'lucide-react'

export function InvoiceHeader() {
	return (
		<div className="mb-12 text-center">
			{/* Logo and Branding */}
			<div className="mb-6 flex items-center justify-center gap-4">
				<div className="relative">
					<div className="bg-primary flex h-16 w-16 transform items-center justify-center rounded-2xl shadow-lg transition-transform duration-200 hover:scale-105">
						<Calculator className="text-primary-foreground h-8 w-8" />
					</div>
					<div className="bg-primary absolute -top-1 -right-1 h-4 w-4 animate-pulse rounded-full"></div>
				</div>
				<div className="text-left">
					<h1 className="text-foreground mb-2 font-serif text-5xl font-bold">
						Invoice Generator
					</h1>
					<p className="text-muted-foreground text-lg">
						by{' '}
						<span className="text-primary font-semibold">
							TenantFlow
						</span>
					</p>
				</div>
			</div>

			{/* Marketing-focused subtitle */}
			<div className="mx-auto max-w-3xl">
				<p className="text-muted-foreground mb-4 text-xl leading-relaxed">
					Create professional invoices that get paid faster. Beautiful
					design meets powerful functionality.
				</p>
				<div className="text-muted-foreground flex flex-wrap items-center justify-center gap-6 text-sm">
					<div className="flex items-center gap-2">
						<CheckCircle className="text-success h-4 w-4" />
						<span>Instant PDF Generation</span>
					</div>
					<div className="flex items-center gap-2">
						<CheckCircle className="text-success h-4 w-4" />
						<span>Auto Tax Calculation</span>
					</div>
					<div className="flex items-center gap-2">
						<CheckCircle className="text-success h-4 w-4" />
						<span>Professional Templates</span>
					</div>
				</div>
			</div>
		</div>
	)
}
