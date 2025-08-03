import { User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UseFormRegister, FieldErrors } from 'react-hook-form'

import type { CustomerInvoiceForm } from '@tenantflow/shared'

interface ClientInfoSectionProps {
register: UseFormRegister<CustomerInvoiceForm>
errors: FieldErrors<CustomerInvoiceForm>
clientState: string
autoTaxRate: number
stateTaxRates: Record<string, number>
}

export function ClientInfoSection({
	register,
	errors,
	clientState,
	autoTaxRate,
	stateTaxRates
}: ClientInfoSectionProps) {
	return (
		<Card className="group bg-card/80 border-0 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl">
			<CardHeader className="from-primary/5 to-accent/5 border-border/50 flex items-center justify-center border-b bg-gradient-to-r py-4">
				<CardTitle className="text-foreground flex items-center justify-center gap-2 text-base">
					<div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-1.5 transition-colors">
						<User className="text-primary h-4 w-4" />
					</div>
					<span className="font-serif">Recipient</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-2 py-4">
				<div className="grid grid-cols-2 gap-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="clientName" className="text-xs">
							Client Name *
						</Label>
						<Input
							id="clientName"
							{...register('clientName', {
								required: 'Client name is required',
								minLength: {
									value: 2,
									message:
										'Client name must be at least 2 characters'
								}
							})}
							placeholder="Client Name"
							className="h-8 text-sm"
						/>
						{errors.clientName && (
							<p className="text-xs text-red-600">
								{errors.clientName.message}
							</p>
						)}
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="clientEmail" className="text-xs">
							Email *
						</Label>
						<Input
							id="clientEmail"
							type="email"
							{...register('clientEmail', {
								required: 'Client email is required',
								pattern: {
									value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
									message: 'Enter a valid email address'
								}
							})}
							placeholder="client@email.com"
							className="h-8 text-sm"
						/>
						{errors.clientEmail && (
							<p className="text-xs text-red-600">
								{errors.clientEmail.message}
							</p>
						)}
					</div>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="clientAddress" className="text-xs">
							Address
						</Label>
						<Input
							id="clientAddress"
							{...register('clientAddress')}
							placeholder="123 Client Street"
							className="h-8 text-sm"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="clientState" className="text-xs">
							State *
						</Label>
						<Input
							id="clientState"
							{...register('clientState', {
								required:
									'State is required for tax calculation',
								pattern: {
									value: /^[A-Za-z]{2}$/,
									message:
										'Enter valid 2-letter state code (e.g., CA, NY, TX)'
								},
								onChange: e => {
									e.target.value =
										e.target.value.toUpperCase()
								}
							})}
							placeholder="CA"
							maxLength={2}
							style={{ textTransform: 'uppercase' }}
							className="h-8 text-sm"
						/>
						{errors.clientState && (
							<p className="text-xs text-red-600">
								{errors.clientState.message}
							</p>
						)}
						{clientState &&
							clientState.length === 2 &&
							stateTaxRates[clientState.toUpperCase()] !==
								undefined && (
								<p className="text-xs text-green-600">
									✓ Tax rate: {autoTaxRate}% for{' '}
									{clientState.toUpperCase()}
								</p>
							)}
					</div>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="clientCity" className="text-xs">
							City
						</Label>
						<Input
							id="clientCity"
							{...register('clientCity')}
							placeholder="City"
							className="h-8 text-sm"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="clientZip" className="text-xs">
							ZIP
						</Label>
						<Input
							id="clientZip"
							{...register('clientZip')}
							placeholder="12345"
							className="h-8 text-sm"
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
