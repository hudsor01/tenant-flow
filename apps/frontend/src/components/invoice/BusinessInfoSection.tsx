import { Building } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UseFormRegister, FieldErrors } from 'react-hook-form'

import type { CustomerInvoice } from '@/types/invoice'

interface BusinessInfoSectionProps {
register: UseFormRegister<CustomerInvoice>
errors: FieldErrors<CustomerInvoice>
}

export function BusinessInfoSection({
	register,
	errors
}: BusinessInfoSectionProps) {
	return (
		<Card className="group bg-white/10 border border-white/20 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:bg-white/15">
			<CardHeader className="from-blue-500/10 to-indigo-500/10 border-white/20 flex items-center justify-center border-b bg-gradient-to-r py-4">
				<CardTitle className="text-white flex items-center justify-center gap-2 text-base">
					<div className="bg-blue-500/20 group-hover:bg-blue-500/30 rounded-lg p-1.5 transition-colors">
						<Building className="text-blue-300 h-4 w-4" />
					</div>
					<span className="font-serif">Sender</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-2 py-4">
				<div className="grid grid-cols-2 gap-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="businessName" className="text-xs text-white/90">
							Business Name *
						</Label>
						<Input
							id="businessName"
							{...register('businessName', {
								required: 'Business name is required',
								minLength: {
									value: 2,
									message:
										'Business name must be at least 2 characters'
								}
							})}
							placeholder="Your Business Name"
							className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
						/>
						{errors.businessName && (
							<p className="text-xs text-red-400">
								{errors.businessName.message}
							</p>
						)}
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="businessEmail" className="text-xs text-white/90">
							Email *
						</Label>
						<Input
							id="businessEmail"
							type="email"
							{...register('businessEmail', {
								required: 'Business email is required',
								pattern: {
									value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
									message: 'Enter a valid email address'
								}
							})}
							placeholder="business@email.com"
							className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
						/>
						{errors.businessEmail && (
							<p className="text-xs text-red-400">
								{errors.businessEmail.message}
							</p>
						)}
					</div>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="businessAddress" className="text-xs text-white/90">
							Address
						</Label>
						<Input
							id="businessAddress"
							{...register('businessAddress')}
							placeholder="123 Business Street"
							className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="businessPhone" className="text-xs text-white/90">
							Phone
						</Label>
						<Input
							id="businessPhone"
							{...register('businessPhone')}
							placeholder="(555) 123-4567"
							className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
						/>
					</div>
				</div>
				<div className="grid grid-cols-3 gap-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="businessCity" className="text-xs text-white/90">
							City
						</Label>
						<Input
							id="businessCity"
							{...register('businessCity')}
							placeholder="City"
							className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="businessState" className="text-xs text-white/90">
							State
						</Label>
						<Input
							id="businessState"
							{...register('businessState')}
							placeholder="ST"
							maxLength={2}
							className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="businessZip" className="text-xs text-white/90">
							ZIP
						</Label>
						<Input
							id="businessZip"
							{...register('businessZip')}
							placeholder="12345"
							className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
