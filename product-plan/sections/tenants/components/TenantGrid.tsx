'use client'

import {
	Mail,
	Phone,
	MapPin,
	Pencil,
	Trash2,
	Eye,
	ChevronDown,
	Check
} from 'lucide-react'
import type {
	TenantItem,
	LeaseStatus
} from '@/../product/sections/tenants/types'
import { BlurFade } from '@/components/ui/blur-fade'
import { BorderBeam } from '@/components/ui/border-beam'

// ============================================================================
// TYPES
// ============================================================================

interface TenantGridProps {
	tenants: TenantItem[]
	selectedIds: Set<string>
	onSelectChange: (ids: string[]) => void
	onView: (id: string) => void
	onEdit: (id: string) => void
	onDelete: (id: string) => void
	onContact: (id: string, method: 'email' | 'phone') => void
}

// ============================================================================
// STATUS DROPDOWN
// ============================================================================

interface StatusDropdownProps {
	value: LeaseStatus | undefined
	onChange: (value: LeaseStatus) => void
}

function StatusDropdown({ value, onChange }: StatusDropdownProps) {
	const statusLabels: Record<LeaseStatus, string> = {
		draft: 'Draft',
		pending_signature: 'Pending',
		active: 'Active',
		ended: 'Ended',
		terminated: 'Terminated'
	}

	return (
		<div className="relative">
			<select
				value={value || 'active'}
				onChange={e => onChange(e.target.value as LeaseStatus)}
				className="appearance-none w-full px-2 py-1 text-xs bg-muted border border-transparent hover:border-border focus:border-primary rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer transition-all"
			>
				{Object.entries(statusLabels).map(([key, label]) => (
					<option key={key} value={key}>
						{label}
					</option>
				))}
			</select>
			<ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
		</div>
	)
}

// ============================================================================
// TENANT CARD
// ============================================================================

interface TenantCardProps {
	tenant: TenantItem
	isSelected: boolean
	onSelect: () => void
	onView: () => void
	onEdit: () => void
	onDelete: () => void
	onContact: (method: 'email' | 'phone') => void
	index: number
}

function TenantCard({
	tenant,
	isSelected,
	onSelect,
	onView,
	onEdit,
	onDelete,
	onContact,
	index
}: TenantCardProps) {
	const isActive = tenant.leaseStatus === 'active'

	return (
		<BlurFade delay={0.05 + index * 0.03} inView>
			<div
				className={`bg-card border rounded-lg p-4 transition-all hover:shadow-md relative overflow-hidden ${
					isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
				}`}
			>
				{/* Active tenant gets a subtle BorderBeam */}
				{isActive && (
					<BorderBeam
						size={100}
						duration={12}
						colorFrom="hsl(var(--primary)/0.5)"
						colorTo="transparent"
					/>
				)}

				{/* Header: Selection + Name */}
				<div className="flex items-start justify-between mb-3">
					<div className="flex items-center gap-3">
						<input
							type="checkbox"
							checked={isSelected}
							onChange={onSelect}
							className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
						/>
						<button
							onClick={onView}
							className="font-medium text-foreground hover:text-primary hover:underline transition-colors text-left"
						>
							{tenant.fullName}
						</button>
						{isActive && (
							<span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded">
								<Check className="w-3 h-3" />
								Active
							</span>
						)}
					</div>
					{/* Status Dropdown */}
					<div className="w-24">
						<StatusDropdown
							value={tenant.leaseStatus}
							onChange={value =>
								console.log('Status change:', tenant.id, value)
							}
						/>
					</div>
				</div>

				{/* Contact Info */}
				<div className="space-y-2 mb-4">
					<button
						onClick={() => onContact('email')}
						className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-full group"
					>
						<Mail className="w-3.5 h-3.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
						<span className="truncate">{tenant.email}</span>
					</button>
					{tenant.phone && (
						<button
							onClick={() => onContact('phone')}
							className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-full group"
						>
							<Phone className="w-3.5 h-3.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
							<span>{tenant.phone}</span>
						</button>
					)}
				</div>

				{/* Property/Unit */}
				{tenant.currentProperty && (
					<div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
						<MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
						<div>
							<p className="text-foreground">{tenant.currentProperty}</p>
							{tenant.currentUnit && (
								<p className="text-xs">Unit {tenant.currentUnit}</p>
							)}
						</div>
					</div>
				)}

				{/* Actions */}
				<div className="flex items-center justify-end gap-1 pt-3 border-t border-border">
					<button
						onClick={onView}
						className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
						title="View"
					>
						<Eye className="w-4 h-4" />
					</button>
					<button
						onClick={onEdit}
						className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
						title="Edit"
					>
						<Pencil className="w-4 h-4" />
					</button>
					<button
						onClick={onDelete}
						className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
						title="Delete"
					>
						<Trash2 className="w-4 h-4" />
					</button>
				</div>
			</div>
		</BlurFade>
	)
}

// ============================================================================
// MAIN GRID COMPONENT
// ============================================================================

export function TenantGrid({
	tenants,
	selectedIds,
	onSelectChange,
	onView,
	onEdit,
	onDelete,
	onContact
}: TenantGridProps) {
	const toggleSelect = (id: string) => {
		const newSelected = new Set(selectedIds)
		if (newSelected.has(id)) {
			newSelected.delete(id)
		} else {
			newSelected.add(id)
		}
		onSelectChange(Array.from(newSelected))
	}

	return (
		<div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{tenants.map((tenant, idx) => (
				<TenantCard
					key={tenant.id}
					tenant={tenant}
					index={idx}
					isSelected={selectedIds.has(tenant.id)}
					onSelect={() => toggleSelect(tenant.id)}
					onView={() => onView(tenant.id)}
					onEdit={() => onEdit(tenant.id)}
					onDelete={() => onDelete(tenant.id)}
					onContact={method => onContact(tenant.id, method)}
				/>
			))}
		</div>
	)
}
