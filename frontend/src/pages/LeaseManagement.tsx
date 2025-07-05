import React, { useState } from 'react'
import {
	Plus,
	DollarSign,
	FileText,
	User,
	CheckCircle,
	AlertCircle,
	Clock
} from 'lucide-react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useLeases } from '@/hooks/useLeases'
import { useProperties } from '@/hooks/useProperties'
import LeaseFormModal from '@/components/leases/LeaseFormModal'
import { format, isAfter, isBefore, addDays } from 'date-fns'
import { motion } from 'framer-motion'

export default function LeaseManagement() {
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
	const [selectedPropertyId, setSelectedPropertyId] = useState('')
	const [searchTerm, setSearchTerm] = useState('')

	const { data: properties = [], isLoading: propertiesLoading } =
		useProperties()
	const {
		data: leases = [],
		isLoading: leasesLoading,
		refetch: refetchLeases
	} = useLeases()
	// Future: Implement tenant and unit filtering

	const isLoading = propertiesLoading || leasesLoading

	// Filter leases based on search term and selected property
	const filteredLeases = leases.filter(lease => {
		const matchesSearch =
			searchTerm === '' ||
			lease.tenant?.name
				?.toLowerCase()
				.includes(searchTerm.toLowerCase()) ||
			lease.unit?.property?.name
				?.toLowerCase()
				.includes(searchTerm.toLowerCase()) ||
			lease.unit?.unitNumber
				?.toLowerCase()
				.includes(searchTerm.toLowerCase())

		const matchesProperty =
			selectedPropertyId === '' ||
			lease.unit?.property?.id === selectedPropertyId

		return matchesSearch && matchesProperty
	})

	// Categorize leases
	const activeLeases = filteredLeases.filter(
		lease => lease.status === 'ACTIVE'
	)
	const expiringLeases = filteredLeases.filter(lease => {
		const endDate = new Date(lease.endDate)
		const now = new Date()
		const in30Days = addDays(now, 30)
		return (
			lease.status === 'ACTIVE' &&
			isAfter(endDate, now) &&
			isBefore(endDate, in30Days)
		)
	})
	const expiredLeases = filteredLeases.filter(
		lease =>
			lease.status === 'EXPIRED' ||
			(lease.status === 'ACTIVE' &&
				isBefore(new Date(lease.endDate), new Date()))
	)

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'ACTIVE':
				return 'bg-green-100 text-green-800'
			case 'EXPIRED':
				return 'bg-red-100 text-red-800'
			case 'TERMINATED':
				return 'bg-gray-100 text-gray-800'
			case 'DRAFT':
				return 'bg-yellow-100 text-yellow-800'
			default:
				return 'bg-gray-100 text-gray-800'
		}
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'ACTIVE':
				return <CheckCircle className="h-3 w-3" />
			case 'EXPIRED':
				return <AlertCircle className="h-3 w-3" />
			case 'TERMINATED':
				return <AlertCircle className="h-3 w-3" />
			case 'INACTIVE':
				return <Clock className="h-3 w-3" />
			default:
				return <Clock className="h-3 w-3" />
		}
	}

	if (isLoading) {
		return (
			<div className="flex min-h-[300px] items-center justify-center sm:min-h-[400px]">
				<div className="text-center">
					<div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-green-600"></div>
					<p className="text-gray-600">
						Loading lease information...
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Lease Management
					</h1>
					<p className="text-gray-600">
						Manage all your property leases and tenant agreements
					</p>
				</div>
				<Button
					onClick={() => setIsCreateModalOpen(true)}
					className="flex items-center gap-2"
				>
					<Plus className="h-4 w-4" />
					Create New Lease
				</Button>
			</div>

			{/* Enhanced Stats Cards - Reordered: Active → Revenue → Expiring → Expired */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				{/* 1. Active Leases */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
				>
					<Card className="transition-shadow duration-300 hover:shadow-lg">
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center">
									<div className="mr-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-100 to-emerald-100">
										<CheckCircle className="h-6 w-6 text-green-600" />
									</div>
									<div>
										<p className="text-3xl font-bold text-gray-900">
											{activeLeases.length}
										</p>
										<p className="text-sm font-medium text-gray-600">
											Active Leases
										</p>
									</div>
								</div>
								<div className="text-right">
									<span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
										Current
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* 2. Monthly Revenue */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<Card className="transition-shadow duration-300 hover:shadow-lg">
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center">
									<div className="mr-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-100 to-indigo-100">
										<DollarSign className="h-6 w-6 text-blue-600" />
									</div>
									<div>
										<p className="text-3xl font-bold text-gray-900">
											$
											{activeLeases
												.reduce(
													(sum, lease) =>
														sum + lease.rentAmount,
													0
												)
												.toLocaleString()}
										</p>
										<p className="text-sm font-medium text-gray-600">
											Monthly Revenue
										</p>
									</div>
								</div>
								<div className="text-right">
									<span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
										Total
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* 3. Expiring Soon */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.3 }}
				>
					<Card className="transition-shadow duration-300 hover:shadow-lg">
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center">
									<div className="mr-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-100 to-orange-100">
										<Clock className="h-6 w-6 text-yellow-600" />
									</div>
									<div>
										<p className="text-3xl font-bold text-gray-900">
											{expiringLeases.length}
										</p>
										<p className="text-sm font-medium text-gray-600">
											Expiring Soon
										</p>
									</div>
								</div>
								<div className="text-right">
									<span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
										30 Days
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* 4. Expired */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.4 }}
				>
					<Card className="transition-shadow duration-300 hover:shadow-lg">
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center">
									<div className="mr-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-red-100 to-rose-100">
										<AlertCircle className="h-6 w-6 text-red-600" />
									</div>
									<div>
										<p className="text-3xl font-bold text-gray-900">
											{expiredLeases.length}
										</p>
										<p className="text-sm font-medium text-gray-600">
											Expired
										</p>
									</div>
								</div>
								<div className="text-right">
									<span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
										Action Needed
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="p-4">
					<div className="flex flex-col gap-4 sm:flex-row">
						<div className="flex-1">
							<Input
								placeholder="Search by tenant name, property, or unit..."
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
								className="w-full"
							/>
						</div>
						<div className="sm:w-64">
							<select
								value={selectedPropertyId}
								onChange={e =>
									setSelectedPropertyId(e.target.value)
								}
								className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring h-10 w-full rounded-md border px-3 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
							>
								<option value="">All Properties</option>
								{properties.map(property => (
									<option
										key={property.id}
										value={property.id}
									>
										{property.name}
									</option>
								))}
							</select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Expiring Leases Alert */}
			{expiringLeases.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
				>
					<Card className="border-orange-200 bg-orange-50">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-orange-800">
								<AlertCircle className="h-5 w-5" />
								Leases Expiring Soon
							</CardTitle>
							<CardDescription className="text-orange-700">
								{expiringLeases.length} lease
								{expiringLeases.length !== 1 ? 's' : ''}{' '}
								expiring within 30 days
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{expiringLeases.slice(0, 3).map(lease => (
									<div
										key={lease.id}
										className="flex items-center justify-between rounded-lg bg-white p-3"
									>
										<div>
											<p className="font-medium">
												{lease.tenant?.name}
											</p>
											<p className="text-sm text-gray-600">
												{lease.unit?.property?.name} -
												Unit {lease.unit?.unitNumber}
											</p>
										</div>
										<div className="text-right">
											<p className="text-sm font-medium text-orange-800">
												Expires{' '}
												{format(
													new Date(lease.endDate),
													'MMM dd, yyyy'
												)}
											</p>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</motion.div>
			)}

			{/* Leases List */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						All Leases ({filteredLeases.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					{filteredLeases.length === 0 ? (
						<div className="py-8 text-center">
							<FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
							<h3 className="mb-2 text-lg font-medium text-gray-900">
								No leases found
							</h3>
							<p className="mb-4 text-gray-600">
								{searchTerm || selectedPropertyId
									? 'Try adjusting your search criteria.'
									: 'Get started by creating your first lease.'}
							</p>
							<Button onClick={() => setIsCreateModalOpen(true)}>
								<Plus className="mr-2 h-4 w-4" />
								Create Lease
							</Button>
						</div>
					) : (
						<div className="space-y-4">
							{filteredLeases.map(lease => (
								<motion.div
									key={lease.id}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="rounded-lg border p-4 transition-colors hover:bg-gray-50"
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="mb-2 flex items-center gap-3">
												<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
													<User className="h-4 w-4 text-blue-600" />
												</div>
												<div>
													<h3 className="font-semibold text-gray-900">
														{lease.tenant?.name}
													</h3>
													<p className="text-sm text-gray-600">
														{lease.tenant?.email}
													</p>
												</div>
											</div>

											<div className="ml-11 grid grid-cols-1 gap-4 md:grid-cols-3">
												<div>
													<p className="mb-1 text-xs text-gray-500">
														Property & Unit
													</p>
													<p className="text-sm font-medium">
														{
															lease.unit?.property
																?.name
														}{' '}
														- Unit{' '}
														{lease.unit?.unitNumber}
													</p>
												</div>
												<div>
													<p className="mb-1 text-xs text-gray-500">
														Lease Period
													</p>
													<p className="text-sm">
														{format(
															new Date(
																lease.startDate
															),
															'MMM dd, yyyy'
														)}{' '}
														-{' '}
														{format(
															new Date(
																lease.endDate
															),
															'MMM dd, yyyy'
														)}
													</p>
												</div>
												<div>
													<p className="mb-1 text-xs text-gray-500">
														Monthly Rent
													</p>
													<p className="text-sm font-medium">
														$
														{lease.rentAmount.toLocaleString()}
													</p>
												</div>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<Badge
												variant="secondary"
												className={getStatusColor(
													lease.status
												)}
											>
												{getStatusIcon(lease.status)}
												<span className="ml-1">
													{lease.status}
												</span>
											</Badge>
										</div>
									</div>
								</motion.div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Create Lease Modal */}
			<LeaseFormModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				onSuccess={() => {
					setIsCreateModalOpen(false)
					refetchLeases()
				}}
			/>
		</div>
	)
}
