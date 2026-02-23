'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Textarea } from '#components/ui/textarea'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#components/ui/dialog'
import { Field, FieldLabel } from '#components/ui/field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#components/ui/select'
import { useCreateVendorMutation, useUpdateVendorMutation } from '#hooks/api/use-vendor'
import type { Vendor, VendorCreateInput } from '#hooks/api/use-vendor'
import { Plus, Pencil } from 'lucide-react'

const TRADES = [
	{ value: 'plumbing', label: 'Plumbing' },
	{ value: 'electrical', label: 'Electrical' },
	{ value: 'hvac', label: 'HVAC' },
	{ value: 'carpentry', label: 'Carpentry' },
	{ value: 'painting', label: 'Painting' },
	{ value: 'landscaping', label: 'Landscaping' },
	{ value: 'appliance', label: 'Appliance Repair' },
	{ value: 'general', label: 'General Contractor' },
	{ value: 'other', label: 'Other' },
] as const

interface VendorFormDialogProps {
	vendor?: Vendor
	onSuccess?: () => void
}

export function VendorFormDialog({ vendor, onSuccess }: VendorFormDialogProps) {
	const [open, setOpen] = useState(false)
	const isEditing = !!vendor

	const createMutation = useCreateVendorMutation()
	const updateMutation = useUpdateVendorMutation()

	const [name, setName] = useState(vendor?.name ?? '')
	const [email, setEmail] = useState(vendor?.email ?? '')
	const [phone, setPhone] = useState(vendor?.phone ?? '')
	const [trade, setTrade] = useState<VendorCreateInput['trade']>(vendor?.trade ?? 'general')
	const [hourlyRate, setHourlyRate] = useState(vendor?.hourly_rate ? String(vendor.hourly_rate) : '')
	const [notes, setNotes] = useState(vendor?.notes ?? '')

	const isSubmitting = createMutation.isPending || updateMutation.isPending

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		if (!name.trim()) return

		const data: VendorCreateInput = {
			name: name.trim(),
			trade,
			...(email.trim() ? { email: email.trim() } : {}),
			...(phone.trim() ? { phone: phone.trim() } : {}),
			...(hourlyRate ? { hourly_rate: parseFloat(hourlyRate) } : {}),
			...(notes.trim() ? { notes: notes.trim() } : {}),
		}

		if (isEditing && vendor) {
			updateMutation.mutate(
				{ id: vendor.id, data },
				{
					onSuccess: () => {
						setOpen(false)
						onSuccess?.()
					},
				},
			)
		} else {
			createMutation.mutate(data, {
				onSuccess: () => {
					setOpen(false)
					setName('')
					setEmail('')
					setPhone('')
					setTrade('general')
					setHourlyRate('')
					setNotes('')
					onSuccess?.()
				},
			})
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{isEditing ? (
					<Button variant="ghost" size="sm" className="gap-1.5 min-h-11">
						<Pencil className="size-4" />
						Edit
					</Button>
				) : (
					<Button className="gap-1.5 min-h-11">
						<Plus className="size-4" />
						Add Vendor
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{isEditing ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
					<DialogDescription>
						{isEditing
							? 'Update vendor details.'
							: 'Add a new contractor or vendor to your roster.'}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<Field>
						<FieldLabel htmlFor="vendor-name">Name *</FieldLabel>
						<Input
							id="vendor-name"
							value={name}
							onChange={e => setName(e.target.value)}
							placeholder="Acme Plumbing"
							required
							className="h-11"
						/>
					</Field>
					<div className="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel htmlFor="vendor-email">Email</FieldLabel>
							<Input
								id="vendor-email"
								type="email"
								value={email}
								onChange={e => setEmail(e.target.value)}
								placeholder="vendor@example.com"
								className="h-11"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="vendor-phone">Phone</FieldLabel>
							<Input
								id="vendor-phone"
								type="tel"
								value={phone}
								onChange={e => setPhone(e.target.value)}
								placeholder="(555) 000-0000"
								className="h-11"
							/>
						</Field>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel htmlFor="vendor-trade">Trade *</FieldLabel>
							<Select
								value={trade}
								onValueChange={v => setTrade(v as VendorCreateInput['trade'])}
							>
								<SelectTrigger id="vendor-trade" className="h-11">
									<SelectValue placeholder="Select trade" />
								</SelectTrigger>
								<SelectContent>
									{TRADES.map(t => (
										<SelectItem key={t.value} value={t.value}>
											{t.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="vendor-rate">Hourly Rate ($)</FieldLabel>
							<Input
								id="vendor-rate"
								type="number"
								min="0"
								step="0.01"
								value={hourlyRate}
								onChange={e => setHourlyRate(e.target.value)}
								placeholder="85.00"
								className="h-11"
							/>
						</Field>
					</div>
					<Field>
						<FieldLabel htmlFor="vendor-notes">Notes</FieldLabel>
						<Textarea
							id="vendor-notes"
							value={notes}
							onChange={e => setNotes(e.target.value)}
							placeholder="Specializations, availability, or other notes..."
							rows={3}
						/>
					</Field>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting || !name.trim()}>
							{isSubmitting
								? isEditing
									? 'Saving...'
									: 'Adding...'
								: isEditing
									? 'Save Changes'
									: 'Add Vendor'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
