import { motion } from '@/lib/lazy-motion'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { Property, Unit, Lease } from '@repo/shared'

// Define local interface for component needs
interface Property_WithUnitsAndLeases extends Property {
	units?: Unit[]
	leases?: Lease[]
}

interface Property_HeaderSectionProps {
	property: Property_WithUnitsAndLeases
	fadeInUp: {
		initial: { opacity: number; y: number }
		animate: { opacity: number; y: number }
	}
	onBackToProperties: () => void
	onEditProperty_: () => void
	onInviteTenant: () => void
	onDelete: () => void
	isDeleting: boolean
}

/**
 * Property_ detail header section with navigation, title, and action menu
 * Displays property name, address, and dropdown menu for property operations
 */
export default function Property_HeaderSection({
	property,
	fadeInUp,
	onBackToProperties,
	onEditProperty_,
	onInviteTenant,
	onDelete,
	isDeleting
}: Property_HeaderSectionProps) {
	return (
		<motion.div {...fadeInUp} className="flex items-center justify-between">
			<div className="flex items-center space-x-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={onBackToProperties}
					className="hover:bg-accent"
				>
					<i className="i-lucide-arrow-left h-5 w-5"  />
				</Button>
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						{property.name}
					</h1>
					<p className="text-muted-foreground mt-1 flex items-center">
						<i className="i-lucide-map-pin mr-1 h-4 w-4"  />
						{property.address}, {property.city}, {property.state}{' '}
						{property.zipCode}
					</p>
				</div>
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="icon">
						<i className="i-lucide-more-vertical h-4 w-4"  />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>Property_ Actions</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={onEditProperty_}>
						<i className="i-lucide-edit mr-2 h-4 w-4"  />
						Edit Property_
					</DropdownMenuItem>
					<DropdownMenuItem onClick={onInviteTenant}>
						<i className="i-lucide-users mr-2 h-4 w-4"  />
						Invite Tenant
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={onDelete}
						disabled={isDeleting}
						className="text-destructive focus:text-destructive"
					>
						<i className="i-lucide-trash-2 mr-2 h-4 w-4"  />
						{isDeleting ? 'Deleting...' : 'Delete Property_'}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</motion.div>
	)
}
