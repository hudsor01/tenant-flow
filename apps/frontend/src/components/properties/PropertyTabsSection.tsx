import React from 'react'
import { useRouter } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	Plus,
	Users,
	Edit,
	Calendar,
	Phone,
	Mail,
	Receipt,
	FileText
} from 'lucide-react'
import type { PropertyWithUnitsAndLeases } from '@/types/relationships'
import type { Unit, Tenant, Lease, Property } from '@/types/entities'
// import PaymentsList from '@/components/payments/PaymentsList' // TODO: Create payments component
import PropertyFileUpload from '@/components/properties/PropertyFileUpload'
import { getUnitLeaseInfo } from '@/hooks/usePropertyDetailData'

// Import missing components - these will need to be created or may already exist
// import PropertyImageGallery from '@/components/properties/PropertyImageGallery';
// import PropertyImageUpload from '@/components/properties/PropertyImageUpload';

interface PropertyTabsSectionProps {
	property: PropertyWithUnitsAndLeases
	totalUnits: number
	fadeInUp: {
		initial: { opacity: number; y: number }
		animate: { opacity: number; y: number }
		transition?: { delay: number }
	}
	onAddUnit: () => void
	onEditUnit: (unit: Unit) => void
	onCreateLease: (unitId: string) => void
	onInviteTenant: () => void
}

/**
 * Property detail tabs section with all tab content
 * Handles units, tenants, payments, images, and property details tabs
 */
export default function PropertyTabsSection({
	property,
	totalUnits,
	fadeInUp,
	onAddUnit,
	onEditUnit,
	onCreateLease,
	onInviteTenant
}: PropertyTabsSectionProps) {
	const router = useRouter()

	return (
		<motion.div {...fadeInUp} transition={{ delay: 0.3 }}>
			<Tabs defaultValue="units" className="space-y-4">
				<TabsList>
					<TabsTrigger value="units">Units</TabsTrigger>
					<TabsTrigger value="tenants">Tenants</TabsTrigger>
					<TabsTrigger value="payments">Payments</TabsTrigger>
					<TabsTrigger value="images">Images</TabsTrigger>
					<TabsTrigger value="details">Property Details</TabsTrigger>
				</TabsList>

				{/* Units Tab */}
				<TabsContent value="units" className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-semibold">
							Units ({totalUnits})
						</h3>
						<Button onClick={onAddUnit} size="sm">
							<Plus className="mr-2 h-4 w-4" />
							Add Unit
						</Button>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{property.units?.map(unit => {
							const { tenant } = getUnitLeaseInfo(unit)

							return (
								<Card
									key={unit.id}
									className="transition-shadow hover:shadow-md"
								>
									<CardHeader className="pb-3">
										<div className="flex items-center justify-between">
											<CardTitle className="text-base">
												Unit {unit.unitNumber}
											</CardTitle>
											<Badge
												variant={
													unit.status === 'OCCUPIED'
														? 'default'
														: 'secondary'
												}
											>
												{unit.status}
											</Badge>
										</div>
										<CardDescription className="text-sm">
											{unit.bedrooms} bed,{' '}
											{unit.bathrooms} bath
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-3">
										<div className="flex items-center justify-between text-sm">
											<span className="text-muted-foreground">
												Square Feet
											</span>
											<span className="font-medium">
												{unit.squareFeet}
											</span>
										</div>
										<div className="flex items-center justify-between text-sm">
											<span className="text-muted-foreground">
												Rent
											</span>
											<span className="font-medium text-green-600">
												${unit.rent}/mo
											</span>
										</div>

										{tenant && 
											typeof tenant === 'object' && 
											tenant !== null && 
											'name' in tenant && 
											'email' in tenant && (
												<div className="border-t pt-2">
													<p className="text-sm font-medium">
														{(tenant as Tenant).name}
													</p>
													<p className="text-muted-foreground text-xs">
														{(tenant as Tenant).email}
													</p>
												</div>
											)}

										<div className="flex gap-2 pt-2">
											<Button
												variant="outline"
												size="sm"
												className="flex-1"
												onClick={() => onEditUnit(unit)}
											>
												<Edit className="mr-1 h-4 w-4" />
												Edit
											</Button>
											{unit.status === 'VACANT' ? (
												<Button
													variant="default"
													size="sm"
													className="flex-1"
													onClick={() =>
														onCreateLease(String(unit.id))
													}
												>
													<FileText className="mr-1 h-4 w-4" />
													Create Lease
												</Button>
											) : (
												tenant && typeof tenant === 'object' && 'id' in tenant && (
													<Button
														variant="default"
														size="sm"
														className="flex-1"
														onClick={() =>
															router.navigate({
																to: `/tenants/${String(tenant.id)}`
															})
														}
													>
														<Receipt className="mr-1 h-4 w-4" />
														Record Payment
													</Button>
												)
											)}
										</div>
									</CardContent>
								</Card>
							)
						})}
					</div>
				</TabsContent>

				{/* Tenants Tab */}
				<TabsContent value="tenants" className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-semibold">
							Current Tenants
						</h3>
						<Button onClick={onInviteTenant} size="sm">
							<Plus className="mr-2 h-4 w-4" />
							Invite Tenant
						</Button>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						{property.units
							?.flatMap(
								(unit: Unit) =>
									unit.leases
										?.filter(
											(lease: Lease) => lease.status === 'ACTIVE'
										)
										.map((lease: Lease) => ({
											...lease.tenant,
											unit,
											lease
										})) || []
							)
							.map(
								(
									tenant: Tenant & {
										unit: Unit
										lease: Lease
									}
								) => (
									<Card
										key={tenant.id}
										className="transition-shadow hover:shadow-md"
									>
										<CardContent className="p-6">
											<div className="flex items-start justify-between">
												<div className="space-y-3">
													<div>
														<h4 className="font-semibold">
															{tenant.name}
														</h4>
														<p className="text-muted-foreground text-sm">
															Unit{' '}
															{
																tenant.unit
																	.unitNumber
															}
														</p>
													</div>

													<div className="space-y-2">
														<div className="flex items-center text-sm">
															<Mail className="text-muted-foreground mr-2 h-4 w-4" />
															<span>
																{tenant.email}
															</span>
														</div>
														{tenant.phone && (
															<div className="flex items-center text-sm">
																<Phone className="text-muted-foreground mr-2 h-4 w-4" />
																<span>
																	{
																		tenant.phone
																	}
																</span>
															</div>
														)}
														<div className="flex items-center text-sm">
															<Calendar className="text-muted-foreground mr-2 h-4 w-4" />
															<span>
																Lease:{' '}
																{format(
																	new Date(
																		tenant.lease.startDate
																	),
																	'MMM yyyy'
																)}{' '}
																-{' '}
																{format(
																	new Date(
																		tenant.lease.endDate
																	),
																	'MMM yyyy'
																)}
															</span>
														</div>
													</div>
												</div>

												<div className="flex gap-2">
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															router.navigate({
																to: `/tenants/${tenant.id}`
															})
														}
													>
														View
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															router.navigate({
																to: `/tenants/${tenant.id}`,
																search: { tab: 'payments' }
															})
														}
													>
														<Receipt className="mr-1 h-4 w-4" />
														Payment
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
								)
							)}
					</div>

					{property.units?.every(
						unit =>
							!unit.leases?.some(
								(lease: Lease) => lease.status === 'ACTIVE'
							)
					) && (
						<div className="py-12 text-center">
							<Users className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
							<p className="text-muted-foreground">
								No active tenants
							</p>
							<Button onClick={onInviteTenant} className="mt-4">
								<Plus className="mr-2 h-4 w-4" />
								Invite Your First Tenant
							</Button>
						</div>
					)}
				</TabsContent>

				{/* Payments Tab */}
				<TabsContent value="payments" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Property Payments</CardTitle>
							<CardDescription>All payments received for units in this property</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="text-center py-8 text-muted-foreground">
								<Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
								<p>Payment management features will be available soon.</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Images Tab */}
				<TabsContent value="images" className="space-y-4">
					<div className="space-y-6">
						{/* Property Image Gallery would go here */}
						<Card>
							<CardHeader>
								<CardTitle>Property Images</CardTitle>
								<CardDescription>
									Upload and manage property photos
								</CardDescription>
							</CardHeader>
							<CardContent>
								<PropertyFileUpload propertyId={String((property as Property).id)} />
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				{/* Details Tab */}
				<TabsContent value="details" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Property Information</CardTitle>
						</CardHeader>
						<CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
							<div className="space-y-4">
								<div>
									<p className="text-muted-foreground text-sm">
										Property Type
									</p>
									<p className="font-medium">
										{(property as { propertyType?: string })
											.propertyType
											? (
													property as {
														propertyType: string
													}
												).propertyType
													.replace('_', ' ')
													.toLowerCase()
													.replace(
														/^\w/,
														(c: string) =>
															c.toUpperCase()
													)
											: 'Single Family'}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground text-sm">
										Address
									</p>
									<p className="font-medium">
										{(property as Property).address || 'N/A'}
										<br />
										{(property as Property).city || 'N/A'}, {(property as Property).state || 'N/A'}{' '}
										{(property as Property).zipCode || 'N/A'}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground text-sm">
										Created
									</p>
									<p className="font-medium">
										{format(
											new Date(property.createdAt),
											'MMM d, yyyy'
										)}
									</p>
								</div>
							</div>
							<div className="space-y-4">
								<div>
									<p className="text-muted-foreground text-sm">
										Total Units
									</p>
									<p className="font-medium">{totalUnits}</p>
								</div>
								{property.description && (
									<div>
										<p className="text-muted-foreground text-sm">
											Description
										</p>
										<p className="font-medium">
											{property.description}
										</p>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</motion.div>
	)
}
