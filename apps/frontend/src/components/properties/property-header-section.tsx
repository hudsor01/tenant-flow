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
import type { Database } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type Property = Database['public']['Tables']['Property']['Row']
type Unit = Database['public']['Tables']['Unit']['Row']
type Lease = Database['public']['Tables']['Lease']['Row']

// Define local interface for component needs
interface PropertyWithUnitsAndLeases extends Property {
	units?: Unit[]
	leases?: Lease[]
}

interface PropertyHeaderSectionProps {
	property: PropertyWithUnitsAndLeases
	fadeInUp: {
		initial: { opacity: number; y: number }
		animate: { opacity: number; y: number }
	}
	onBackToProperties: () => void
	onEditProperty: () => void
	onInviteTenant: () => void
	onDelete: () => void
	isDeleting: boolean
}

/**
 * Property detail header section with navigation, title, and action menu
 * Displays property name, address, and dropdown menu for property operations
 */
export default function PropertyHeaderSection({
	property,
	fadeInUp,
	onBackToProperties,
	onEditProperty,
	onInviteTenant,
	onDelete,
	isDeleting
}: PropertyHeaderSectionProps) {
	return (
		<motion.div {...fadeInUp} className="flex items-center justify-between">
			<div className="flex items-center space-x-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={onBackToProperties}
					className="hover:bg-accent"
				>
					<i className="i-lucide-arrow-left inline-block h-5 w-5"  />
				</Button>
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						{property.name}
					</h1>
					<p className="text-muted-foreground mt-1 flex items-center">
						<i className="i-lucide-map-pin inline-block mr-1 h-4 w-4"  />
						{property.address}, {property.city}, {property.state}{' '}
						{property.zipCode}
					</p>
				</div>
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="icon">
						<i className="i-lucide-more-vertical inline-block h-4 w-4"  />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>Property Actions</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={onEditProperty}>
						<i className="i-lucide-edit inline-block mr-2 h-4 w-4"  />
						Edit Property
					</DropdownMenuItem>
					<DropdownMenuItem onClick={onInviteTenant}>
						<i className="i-lucide-users inline-block mr-2 h-4 w-4"  />
						Invite Tenant
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={onDelete}
						disabled={isDeleting}
						className="text-destructive focus:text-destructive"
					>
						<i className="i-lucide-trash-2 inline-block mr-2 h-4 w-4"  />
						{isDeleting ? 'Deleting...' : 'Delete Property'}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</motion.div>
	)
}
