import React from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	Users,
	Mail,
	Phone,
	Calendar,
	DollarSign,
	CheckCircle,
	AlertCircle,
	Clock
} from 'lucide-react'
import { mockTenants, mockActions } from '../utils/mockData'
import { StoryErrorBoundary } from '../utils/ErrorBoundary'

const meta = {
	title: 'Business Components/Tenant Card',
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Tenant management card with lease information and contact actions.'
			}
		}
	},
	decorators: [
		Story => (
			<StoryErrorBoundary>
				<Story />
			</StoryErrorBoundary>
		)
	]
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Tenant Card Component
interface TenantCardProps {
	tenant: (typeof mockTenants)[0]
	onMessage?: (id: string) => void
	onCall?: (id: string) => void
	onViewLease?: (id: string) => void
	onEdit?: (id: string) => void
	showActions?: boolean
}

const TenantCard: React.FC<TenantCardProps> = ({
	tenant,
	onMessage = () => {},
	onCall = () => {},
	onViewLease = () => {},
	onEdit = () => {},
	showActions = true
}) => {
	const getPaymentStatus = (lastPayment: string) => {
		const paymentDate = new Date(lastPayment)
		const today = new Date()
		const daysDiff = Math.floor(
			(today.getTime() - paymentDate.getTime()) / (1000 * 3600 * 24)
		)

		if (daysDiff <= 5) {
			return {
				status: 'current',
				color: 'bg-green-100 text-green-800',
				icon: CheckCircle
			}
		} else if (daysDiff <= 30) {
			return {
				status: 'due-soon',
				color: 'bg-yellow-100 text-yellow-800',
				icon: Clock
			}
		} else {
			return {
				status: 'overdue',
				color: 'bg-red-100 text-red-800',
				icon: AlertCircle
			}
		}
	}

	const getLeaseStatus = (leaseEnd: string) => {
		const endDate = new Date(leaseEnd)
		const today = new Date()
		const monthsDiff = Math.floor(
			(endDate.getTime() - today.getTime()) / (1000 * 3600 * 24 * 30)
		)

		if (monthsDiff < 0)
			return { status: 'expired', color: 'bg-red-100 text-red-800' }
		if (monthsDiff <= 2)
			return {
				status: 'expiring-soon',
				color: 'bg-yellow-100 text-yellow-800'
			}
		return { status: 'active', color: 'bg-green-100 text-green-800' }
	}

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}

	const paymentStatus = getPaymentStatus(tenant.lastPayment)
	const leaseStatus = getLeaseStatus(tenant.leaseEnd)
	const PaymentIcon = paymentStatus.icon

	return (
		<Card
			className="transition-shadow duration-300 hover:shadow-lg"
			data-testid={`tenant-card-${tenant.id}`}
		>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex flex-1 items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
							<Users className="h-6 w-6 text-blue-600" />
						</div>
						<div className="flex-1">
							<CardTitle className="text-lg">
								{tenant.name}
							</CardTitle>
							<CardDescription className="mt-1 flex items-center gap-4">
								<span>Unit {tenant.unit}</span>
								<Badge className={leaseStatus.color}>
									{leaseStatus.status.replace('-', ' ')}
								</Badge>
							</CardDescription>
						</div>
					</div>
					<Badge
						className={paymentStatus.color}
						data-testid={`payment-status-${tenant.id}`}
					>
						<PaymentIcon className="mr-1 h-3 w-3" />
						{paymentStatus.status.replace('-', ' ')}
					</Badge>
				</div>
			</CardHeader>

			<CardContent>
				{/* Contact Information */}
				<div className="mb-4 space-y-3">
					<div className="flex items-center gap-2 text-sm">
						<Mail className="h-4 w-4 text-gray-400" />
						<span className="text-gray-600">{tenant.email}</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<Phone className="h-4 w-4 text-gray-400" />
						<span className="text-gray-600">{tenant.phone}</span>
					</div>
				</div>

				{/* Financial Information */}
				<div className="mb-4 grid grid-cols-2 gap-4 text-sm">
					<div className="space-y-2">
						<div className="flex justify-between">
							<span className="text-gray-500">Monthly Rent:</span>
							<span className="flex items-center gap-1 font-medium">
								<DollarSign className="h-3 w-3" />$
								{tenant.rent.toLocaleString()}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-500">
								Security Deposit:
							</span>
							<span className="font-medium">
								${tenant.deposit.toLocaleString()}
							</span>
						</div>
					</div>
					<div className="space-y-2">
						<div className="flex justify-between">
							<span className="text-gray-500">Last Payment:</span>
							<span className="font-medium">
								{formatDate(tenant.lastPayment)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-500">Lease Ends:</span>
							<span className="font-medium">
								{formatDate(tenant.leaseEnd)}
							</span>
						</div>
					</div>
				</div>

				{/* Lease Duration */}
				<div className="rounded-lg bg-gray-50 p-3">
					<div className="flex items-center gap-2 text-sm text-gray-600">
						<Calendar className="h-4 w-4" />
						<span>
							Lease: {formatDate(tenant.leaseStart)} -{' '}
							{formatDate(tenant.leaseEnd)}
						</span>
					</div>
				</div>
			</CardContent>

			{showActions && (
				<CardFooter className="gap-2">
					<Button
						variant="outline"
						size="sm"
						className="flex-1"
						onClick={() => onMessage(tenant.id)}
						data-testid={`message-${tenant.id}`}
					>
						<Mail className="mr-1 h-4 w-4" />
						Message
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="flex-1"
						onClick={() => onCall(tenant.id)}
						data-testid={`call-${tenant.id}`}
					>
						<Phone className="mr-1 h-4 w-4" />
						Call
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="flex-1"
						onClick={() => onViewLease(tenant.id)}
						data-testid={`lease-${tenant.id}`}
					>
						View Lease
					</Button>
				</CardFooter>
			)}
		</Card>
	)
}

// Stories
export const CurrentTenant: Story = {
	render: () => (
		<div className="max-w-md">
			<TenantCard
				tenant={mockTenants[0]}
				onMessage={fn()}
				onCall={fn()}
				onViewLease={fn()}
				onEdit={fn()}
			/>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		// Test tenant card interactions
		const messageButton = canvas.getByTestId('message-1')
		const callButton = canvas.getByTestId('call-1')
		const leaseButton = canvas.getByTestId('lease-1')

		await userEvent.click(messageButton)
		await userEvent.click(callButton)
		await userEvent.click(leaseButton)

		// Check payment status is visible
		const paymentStatus = canvas.getByTestId('payment-status-1')
		expect(paymentStatus).toBeInTheDocument()
	}
}

export const TenantsList: Story = {
	render: () => (
		<div className="space-y-4">
			{mockTenants.map(tenant => (
				<TenantCard
					key={tenant.id}
					tenant={tenant}
					onMessage={mockActions.onTenantClick}
					onCall={mockActions.onTenantClick}
					onViewLease={mockActions.onTenantClick}
					onEdit={mockActions.onEditClick.bind(null, 'tenant')}
				/>
			))}
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		// Test multiple tenant interactions
		const cards = canvas.getAllByTestId(/tenant-card-/)
		expect(cards).toHaveLength(2)

		// Test actions on different tenants
		const messageButtons = canvas.getAllByTestId(/message-/)
		await userEvent.click(messageButtons[0])

		const callButtons = canvas.getAllByTestId(/call-/)
		await userEvent.click(callButtons[1])
	}
}

export const TenantGrid: Story = {
	render: () => (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
			{mockTenants.map(tenant => (
				<TenantCard
					key={tenant.id}
					tenant={tenant}
					onMessage={mockActions.onTenantClick}
					onCall={mockActions.onTenantClick}
					onViewLease={mockActions.onTenantClick}
				/>
			))}
		</div>
	)
}

export const DifferentPaymentStates: Story = {
	render: () => {
		const tenants = [
			{
				...mockTenants[0],
				lastPayment: '2024-12-12',
				name: 'Current Tenant'
			},
			{
				...mockTenants[1],
				lastPayment: '2024-11-28',
				name: 'Due Soon Tenant'
			},
			{
				...mockTenants[0],
				id: '3',
				lastPayment: '2024-10-15',
				name: 'Overdue Tenant'
			}
		]

		return (
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{tenants.map(tenant => (
					<TenantCard
						key={tenant.id}
						tenant={tenant}
						onMessage={mockActions.onTenantClick}
						onCall={mockActions.onTenantClick}
						onViewLease={mockActions.onTenantClick}
					/>
				))}
			</div>
		)
	}
}

export const WithoutActions: Story = {
	render: () => (
		<div className="max-w-md">
			<TenantCard tenant={mockTenants[0]} showActions={false} />
		</div>
	)
}

export const LoadingState: Story = {
	render: () => (
		<div className="space-y-4">
			{[1, 2, 3].map(i => (
				<Card key={i}>
					<CardHeader>
						<div className="flex items-center gap-3">
							<div className="h-12 w-12 animate-pulse rounded-full bg-gray-200" />
							<div className="flex-1 space-y-2">
								<div className="h-4 animate-pulse rounded bg-gray-200" />
								<div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
							</div>
							<div className="h-6 w-16 animate-pulse rounded bg-gray-200" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							<div className="h-3 animate-pulse rounded bg-gray-200" />
							<div className="h-3 animate-pulse rounded bg-gray-200" />
							<div className="h-16 animate-pulse rounded bg-gray-200" />
							<div className="h-12 animate-pulse rounded bg-gray-200" />
						</div>
					</CardContent>
					<CardFooter>
						<div className="flex w-full gap-2">
							<div className="h-8 flex-1 animate-pulse rounded bg-gray-200" />
							<div className="h-8 flex-1 animate-pulse rounded bg-gray-200" />
							<div className="h-8 flex-1 animate-pulse rounded bg-gray-200" />
						</div>
					</CardFooter>
				</Card>
			))}
		</div>
	)
}

export const EmptyState: Story = {
	render: () => (
		<div className="py-12 text-center">
			<Users className="mx-auto mb-4 h-16 w-16 text-gray-400" />
			<h3 className="mb-2 text-lg font-semibold text-gray-600">
				No Tenants Found
			</h3>
			<p className="mb-6 text-gray-500">
				Start by adding tenants to your properties
			</p>
			<Button onClick={fn()} data-testid="add-tenant">
				<Users className="mr-2 h-4 w-4" />
				Add Tenant
			</Button>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const addButton = canvas.getByTestId('add-tenant')
		await userEvent.click(addButton)
	}
}
