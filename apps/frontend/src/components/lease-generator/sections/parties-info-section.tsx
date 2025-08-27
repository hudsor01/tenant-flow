import { useFieldArray } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { LeaseFormData } from '@repo/shared'

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
						<i className="i-lucide-user inline-block text-primary h-5 w-5"  />
						Landlord Information
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label
								htmlFor="landlordName"
								className="text-sm font-medium"
							>
								Full Name *
							</Label>
							<Input
								id="landlordName"
								placeholder="John Smith"
								{...form.register('landlordName')}
								className={
									form.formState.errors.landlordName
										? 'border-destructive'
										: ''
								}
							/>
							{form.formState.errors.landlordName && (
								<p className="text-destructive text-sm">
									{form.formState.errors.landlordName.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="landlordEmail"
								className="text-sm font-medium"
							>
								Email Address *
							</Label>
							<div className="relative">
								<i className="i-lucide-mail inline-block text-muted-foreground absolute left-3 top-3 h-4 w-4"  />
								<Input
									id="landlordEmail"
									type="email"
									placeholder="john@tenantflow.app"
									className="form-input pl-9"
									data-error={!!form.formState.errors.landlordEmail}
									{...form.register('landlordEmail')}
								/>
							</div>
							{form.formState.errors.landlordEmail && (
								<p className="text-destructive text-sm">
									{
										form.formState.errors.landlordEmail
											.message
									}
								</p>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label
								htmlFor="landlordPhone"
								className="text-sm font-medium"
							>
								Phone Number{' '}
								<span className="text-muted-foreground">
									(Optional)
								</span>
							</Label>
							<div className="relative">
								<i className="i-lucide-phone inline-block text-muted-foreground absolute left-3 top-3 h-4 w-4"  />
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
							<Label
								htmlFor="landlordAddress"
								className="text-sm font-medium"
							>
								Mailing Address *
							</Label>
							<div className="relative">
								<i className="i-lucide-map-pin inline-block text-muted-foreground absolute left-3 top-3 h-4 w-4"  />
								<Input
									id="landlordAddress"
									placeholder="123 Business St, City, State 12345"
									className={`pl-9 ${form.formState.errors.landlordAddress ? 'input-error' : ''}`}
									{...form.register('landlordAddress')}
								/>
							</div>
							{form.formState.errors.landlordAddress && (
								<p className="text-destructive text-sm">
									{
										form.formState.errors.landlordAddress
											.message
									}
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
							<i className="i-lucide-user-plus inline-block text-primary h-5 w-5"  />
							Tenant Information
						</CardTitle>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addTenant}
							className="flex items-center gap-2"
						>
							<i className="i-lucide-user-plus inline-block h-4 w-4"  />
							Add Tenant
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{fields.map((field, index) => (
						<div key={field.id} className="space-y-2">
							<div className="flex items-center justify-between">
								<Label
									htmlFor={`tenant-${index}`}
									className="text-sm font-medium"
								>
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
										<i className="i-lucide-minus inline-block h-4 w-4"  />
									</Button>
								)}
							</div>
							<Input
								id={`tenant-${index}`}
								placeholder="Jane Doe"
								{...form.register(
									`tenantNames.${index}.name` as const
								)}
								className={
									form.formState.errors.tenantNames?.[index]
										?.name
										? 'border-destructive'
										: ''
								}
							/>
							{form.formState.errors.tenantNames?.[index]
								?.name && (
								<p className="text-destructive text-sm">
									{
										form.formState.errors.tenantNames[index]
											?.name?.message
									}
								</p>
							)}
							{index < fields.length - 1 && (
								<Separator className="mt-4" />
							)}
						</div>
					))}

					{form.formState.errors.tenantNames?.root && (
						<p className="text-destructive text-sm">
							{form.formState.errors.tenantNames.root.message}
						</p>
					)}

					<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
						<div className="flex items-start gap-2">
							<i className="i-lucide-user-plus inline-block mt-0.5 h-5 w-5 text-amber-600"  />
							<div>
								<h4 className="font-medium text-amber-900">
									Multiple Tenants
								</h4>
								<p className="mt-1 text-sm text-amber-700">
									If multiple people will be living in the
									property, add all adult tenants who will be
									legally responsible for the lease agreement.
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
