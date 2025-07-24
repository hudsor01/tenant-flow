import { useFieldArray } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { User, UserPlus, Minus, Mail, Phone, MapPin } from 'lucide-react'
import type { LeaseFormData } from '@tenantflow/shared'

interface PartiesInfoSectionProps {
	form: UseFormReturn<LeaseFormData>
}

export function PartiesInfoSection({ form }: PartiesInfoSectionProps) {
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: 'tenantNames'
	})

	const addTenant = () => {
		append({ name: '' })
	}

	const removeTenant = (index: number) => {
		if (fields.length > 1) {
			remove(index)
		}
	}

	return (
		<div className="space-y-6">
			{/* Landlord Information */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<User className="h-5 w-5 text-primary" />
						Landlord Information
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="landlordName" className="text-sm font-medium">
								Full Name *
							</Label>
							<Input
								id="landlordName"
								placeholder="John Smith"
								{...form.register('landlordName')}
								className={form.formState.errors.landlordName ? 'border-destructive' : ''}
							/>
							{form.formState.errors.landlordName && (
								<p className="text-destructive text-sm">
									{form.formState.errors.landlordName.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="landlordEmail" className="text-sm font-medium">
								Email Address *
							</Label>
							<div className="relative">
								<Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									id="landlordEmail"
									type="email"
									placeholder="john@tenantflow.app"
									className={`pl-9 ${form.formState.errors.landlordEmail ? 'border-destructive' : ''}`}
									{...form.register('landlordEmail')}
								/>
							</div>
							{form.formState.errors.landlordEmail && (
								<p className="text-destructive text-sm">
									{form.formState.errors.landlordEmail.message}
								</p>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="landlordPhone" className="text-sm font-medium">
								Phone Number <span className="text-muted-foreground">(Optional)</span>
							</Label>
							<div className="relative">
								<Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									id="landlordPhone"
									type="tel"
									placeholder="(555) 123-4567"
									className="pl-9"
									{...form.register('landlordPhone')}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="landlordAddress" className="text-sm font-medium">
								Mailing Address *
							</Label>
							<div className="relative">
								<MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									id="landlordAddress"
									placeholder="123 Business St, City, State 12345"
									className={`pl-9 ${form.formState.errors.landlordAddress ? 'border-destructive' : ''}`}
									{...form.register('landlordAddress')}
								/>
							</div>
							{form.formState.errors.landlordAddress && (
								<p className="text-destructive text-sm">
									{form.formState.errors.landlordAddress.message}
								</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Tenant Information */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<UserPlus className="h-5 w-5 text-primary" />
							Tenant Information
						</CardTitle>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addTenant}
							className="flex items-center gap-2"
						>
							<UserPlus className="h-4 w-4" />
							Add Tenant
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{fields.map((field, index) => (
						<div key={field.id} className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor={`tenant-${index}`} className="text-sm font-medium">
									Tenant {index + 1} Full Name *
								</Label>
								{fields.length > 1 && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => removeTenant(index)}
										className="text-destructive hover:text-destructive/80 h-6 w-6 p-0"
									>
										<Minus className="h-4 w-4" />
									</Button>
								)}
							</div>
							<Input
								id={`tenant-${index}`}
								placeholder="Jane Doe"
								{...form.register(`tenantNames.${index}.name` as const)}
								className={form.formState.errors.tenantNames?.[index]?.name ? 'border-destructive' : ''}
							/>
							{form.formState.errors.tenantNames?.[index]?.name && (
								<p className="text-destructive text-sm">
									{form.formState.errors.tenantNames[index]?.name?.message}
								</p>
							)}
							{index < fields.length - 1 && <Separator className="mt-4" />}
						</div>
					))}

					{form.formState.errors.tenantNames?.root && (
						<p className="text-destructive text-sm">
							{form.formState.errors.tenantNames.root.message}
						</p>
					)}

					<div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
						<div className="flex items-start gap-2">
							<UserPlus className="h-5 w-5 text-amber-600 mt-0.5" />
							<div>
								<h4 className="font-medium text-amber-900">
									Multiple Tenants
								</h4>
								<p className="text-amber-700 text-sm mt-1">
									If multiple people will be living in the property, add all adult tenants 
									who will be legally responsible for the lease agreement.
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}