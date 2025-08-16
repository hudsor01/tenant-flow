import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from '@storybook/test'
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
	Building,
	MapPin,
	Users,
	DollarSign,
	TrendingUp,
	Eye,
	Edit,
	Trash2
} from 'lucide-react'
import { mockProperties, mockActions } from '../utils/mockData'
import { BusinessComponentErrorBoundary } from '../utils/GranularErrorBoundaries'

const meta = {
	title: 'Business Components/Property Card',
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Property card component with real-world data and interactions.'
			}
		}
	},
	decorators: [
		Story => (
			<BusinessComponentErrorBoundary>
				<Story />
			</BusinessComponentErrorBoundary>
		)
	]
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Property Card Component
interface PropertyCardProps {
	property: (typeof mockProperties)[0]
	onView?: (id: string) => void
	onEdit?: (id: string) => void
	onDelete?: (id: string) => void
	showActions?: boolean
}

const PropertyCard: React.FC<PropertyCardProps> = ({
	property,
	onView = () => {},
	onEdit = () => {},
	onDelete = () => {},
	showActions = true
}) => {
	const getStatusColor = (status: string) => {
		switch (status.toLowerCase()) {
			case 'active':
				return 'bg-green-100 text-green-800'
			case 'vacant':
				return 'bg-yellow-100 text-yellow-800'
			case 'maintenance':
				return 'bg-red-100 text-red-800'
			default:
				return 'bg-gray-100 text-gray-800'
		}
	}

	return (
		<Card
			className="overflow-hidden transition-shadow duration-300 hover:shadow-lg"
			data-testid={`property-card-${property.id}`}
		>
			{/* Property Image/Header */}
			<div className="relative aspect-video bg-gradient-to-br from-blue-50 to-indigo-100">
				<div className="absolute inset-0 flex items-center justify-center">
					<Building className="h-16 w-16 text-blue-500/50" />
				</div>
				<div className="absolute top-4 left-4">
					<Badge className={getStatusColor(property.status)}>
						{property.status}
					</Badge>
				</div>
				<div className="absolute top-4 right-4">
					<div className="rounded-md bg-white/90 px-2 py-1 backdrop-blur-sm">
						<span className="text-sm font-semibold text-gray-800">
							{property.occupancyRate}% occupied
						</span>
					</div>
				</div>
			</div>

			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<CardTitle className="text-lg">
							{property.name}
						</CardTitle>
						<CardDescription className="mt-1 flex items-center gap-1">
							<MapPin className="h-3 w-3" />
							{property.address}
						</CardDescription>
					</div>
					{showActions && (
						<div className="ml-2 flex gap-1">
							<Button
								size="sm"
								variant="ghost"
								onClick={() => onView(property.id)}
								data-testid={`view-${property.id}`}
								className="h-8 w-8 p-0"
							>
								<Eye className="h-4 w-4" />
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => onEdit(property.id)}
								data-testid={`edit-${property.id}`}
								className="h-8 w-8 p-0"
							>
								<Edit className="h-4 w-4" />
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => onDelete(property.id)}
								data-testid={`delete-${property.id}`}
								className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					)}
				</div>
			</CardHeader>

			<CardContent>
				<div className="grid grid-cols-2 gap-4 text-sm">
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-gray-500">Type:</span>
							<span className="font-medium">{property.type}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-500">Units:</span>
							<span className="flex items-center gap-1 font-medium">
								<Users className="h-3 w-3" />
								{property.units}
							</span>
						</div>
					</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-gray-500">Rent:</span>
							<span className="flex items-center gap-1 font-medium">
								<DollarSign className="h-3 w-3" />$
								{property.rent.toLocaleString()}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-500">Occupied:</span>
							<span className="font-medium text-green-600">
								{property.occupied}/{property.units}
							</span>
						</div>
					</div>
				</div>

				{/* Revenue Info */}
				<div className="mt-4 rounded-lg bg-gray-50 p-3">
					<div className="flex items-center justify-between">
						<span className="text-sm text-gray-600">
							Monthly Revenue
						</span>
						<span className="flex items-center gap-1 font-semibold text-green-600">
							<TrendingUp className="h-4 w-4" />$
							{(
								property.rent * property.occupied
							).toLocaleString()}
						</span>
					</div>
				</div>
			</CardContent>

			<CardFooter className="pt-4">
				<Button
					className="w-full"
					onClick={() => onView(property.id)}
					data-testid={`view-details-${property.id}`}
				>
					View Details
				</Button>
			</CardFooter>
		</Card>
	)
}

// Stories
export const SingleProperty: Story = {
	render: () => (
		<div className="max-w-sm">
			<PropertyCard
				property={mockProperties[0]}
				onView={fn()}
				onEdit={fn()}
				onDelete={fn()}
			/>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		// Test property card interactions
		const viewButton = canvas.getByTestId('view-details-1')
		await userEvent.click(viewButton)

		// Test action buttons
		const editButton = canvas.getByTestId('edit-1')
		await userEvent.click(editButton)
	}
}

export const PropertyGrid: Story = {
	render: () => (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{mockProperties.map(property => (
				<PropertyCard
					key={property.id}
					property={property}
					onView={mockActions.onPropertyClick}
					onEdit={mockActions.onEditClick.bind(null, 'property')}
					onDelete={mockActions.onDeleteClick.bind(null, 'property')}
				/>
			))}
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		// Test multiple property interactions
		const cards = canvas.getAllByTestId(/property-card-/)
		expect(cards).toHaveLength(3)

		// Test first property
		const firstCard = canvas.getByTestId('property-card-1')
		expect(firstCard).toBeInTheDocument()

		// Test actions on multiple cards
		const viewButtons = canvas.getAllByTestId(/view-details-/)
		await userEvent.click(viewButtons[0])
		await userEvent.click(viewButtons[1])
	}
}

export const EmptyState: Story = {
	render: () => (
		<div className="py-12 text-center">
			<Building className="mx-auto mb-4 h-16 w-16 text-gray-400" />
			<h3 className="mb-2 text-lg font-semibold text-gray-600">
				No Properties Found
			</h3>
			<p className="mb-6 text-gray-500">
				Get started by adding your first property
			</p>
			<Button onClick={fn()} data-testid="add-property">
				<Building className="mr-2 h-4 w-4" />
				Add Property
			</Button>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const addButton = canvas.getByTestId('add-property')
		await userEvent.click(addButton)
	}
}

export const LoadingState: Story = {
	render: () => (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{[1, 2, 3].map(i => (
				<Card key={i} className="overflow-hidden">
					<div className="aspect-video animate-pulse bg-gray-200" />
					<CardHeader>
						<div className="space-y-2">
							<div className="h-4 animate-pulse rounded bg-gray-200" />
							<div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							<div className="h-3 animate-pulse rounded bg-gray-200" />
							<div className="h-3 animate-pulse rounded bg-gray-200" />
							<div className="h-8 animate-pulse rounded bg-gray-200" />
						</div>
					</CardContent>
					<CardFooter>
						<div className="h-10 w-full animate-pulse rounded bg-gray-200" />
					</CardFooter>
				</Card>
			))}
		</div>
	)
}

export const DifferentStates: Story = {
	render: () => {
		const properties = [
			{ ...mockProperties[0], status: 'Active', occupancyRate: 100 },
			{
				...mockProperties[1],
				status: 'Vacant',
				occupancyRate: 0,
				occupied: 0
			},
			{
				...mockProperties[2],
				status: 'Maintenance',
				occupancyRate: 50,
				occupied: 6
			}
		]

		return (
			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
				{properties.map(property => (
					<PropertyCard
						key={property.id}
						property={property}
						onView={mockActions.onPropertyClick}
						onEdit={mockActions.onEditClick.bind(null, 'property')}
						onDelete={mockActions.onDeleteClick.bind(
							null,
							'property'
						)}
					/>
				))}
			</div>
		)
	}
}

export const WithoutActions: Story = {
	render: () => (
		<div className="max-w-sm">
			<PropertyCard property={mockProperties[0]} showActions={false} />
		</div>
	)
}
