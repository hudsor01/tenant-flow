import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Textarea } from '#components/ui/textarea'

interface MoveOutDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	moveOutDate: string
	onMoveOutDateChange: (value: string) => void
	moveOutReason: string
	onMoveOutReasonChange: (value: string) => void
	additionalNotes: string
	onAdditionalNotesChange: (value: string) => void
	isPending: boolean
	onSubmit: () => void
}

export function MoveOutDialog({
	open,
	onOpenChange,
	moveOutDate,
	onMoveOutDateChange,
	moveOutReason,
	onMoveOutReasonChange,
	additionalNotes,
	onAdditionalNotesChange,
	isPending,
	onSubmit
}: MoveOutDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Mark Tenant as Moved Out</DialogTitle>
					<DialogDescription>
						This will mark the tenant as moved out and remove them from active
						listings. All data will be retained for legal compliance.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="moveOutDate">Move Out Date *</Label>
						<Input id="moveOutDate" type="date" value={moveOutDate} onChange={e => onMoveOutDateChange(e.target.value)} required />
					</div>

					<div className="space-y-2">
						<Label htmlFor="moveOutReason">Reason *</Label>
						<Select value={moveOutReason} onValueChange={onMoveOutReasonChange}>
							<SelectTrigger id="moveOutReason"><SelectValue placeholder="Select reason" /></SelectTrigger>
							<SelectContent>
								<SelectItem value="lease_expired">Lease Expired</SelectItem>
								<SelectItem value="early_termination">Early Termination</SelectItem>
								<SelectItem value="eviction">Eviction</SelectItem>
								<SelectItem value="purchase">Purchased Property</SelectItem>
								<SelectItem value="relocation">Relocation</SelectItem>
								<SelectItem value="other">Other</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
						<Textarea id="additionalNotes" value={additionalNotes} onChange={e => onAdditionalNotesChange(e.target.value)} placeholder="Any additional details..." rows={3} />
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
					<Button onClick={onSubmit} disabled={isPending || !moveOutDate || !moveOutReason}>
						{isPending ? 'Processing...' : 'Mark as Moved Out'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
