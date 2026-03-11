import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Label } from '#components/ui/label'
import { Input } from '#components/ui/input'
import { Button } from '#components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { BedDouble, DollarSign, Ruler, ShowerHead } from 'lucide-react'
import type { UnitRowWithRelations as UnitRow, UnitStatus } from '#types/core'
import { UnitStatusBadge } from './unit-status-badge'

interface UnitViewDialogProps {
	unit: UnitRow
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function UnitViewDialog({ unit, open, onOpenChange }: UnitViewDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Unit {unit.unit_number} Details</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="flex items-center gap-2">
							<BedDouble className="size-4 text-muted-foreground" />
							<span>{unit.bedrooms} Bedrooms</span>
						</div>
						<div className="flex items-center gap-2">
							<ShowerHead className="size-4 text-muted-foreground" />
							<span>{unit.bathrooms} Bathrooms</span>
						</div>
						{unit.square_feet && (
							<div className="flex items-center gap-2">
								<Ruler className="size-4 text-muted-foreground" />
								<span>{unit.square_feet} sq ft</span>
							</div>
						)}
						<div className="flex items-center gap-2">
							<DollarSign className="size-4 text-muted-foreground" />
							<span>${unit.rent_amount}/month</span>
						</div>
					</div>
					<div>
						<Label>Status</Label>
						<div className="mt-1">
							<UnitStatusBadge status={unit.status as UnitStatus} />
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

interface UnitEditDialogProps {
	unit: UnitRow
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function UnitEditDialog({ unit, open, onOpenChange }: UnitEditDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Unit {unit.unit_number}</DialogTitle>
					<DialogDescription>View unit details</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<Label>Unit Number</Label>
						<Input value={unit.unit_number || ''} disabled />
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Bedrooms</Label>
							<Input type="number" value={unit.bedrooms ?? ''} disabled />
						</div>
						<div>
							<Label>Bathrooms</Label>
							<Input type="number" value={unit.bathrooms ?? ''} disabled />
						</div>
					</div>
					<div>
						<Label>Square Feet</Label>
						<Input type="number" value={unit.square_feet || ''} disabled />
					</div>
					<div>
						<Label>Rent Amount</Label>
						<Input type="number" value={unit.rent_amount} disabled />
					</div>
					<div>
						<Label>Status</Label>
						<Select value={unit.status} disabled>
							<SelectTrigger><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="OCCUPIED">Occupied</SelectItem>
								<SelectItem value="available">Vacant</SelectItem>
								<SelectItem value="MAINTENANCE">Maintenance</SelectItem>
								<SelectItem value="RESERVED">Reserved</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
