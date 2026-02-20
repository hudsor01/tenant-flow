'use client'

import { useState } from 'react'
import { Building2, Phone, Mail, DollarSign, Search, Trash2 } from 'lucide-react'
import { useVendors, useDeleteVendorMutation } from '#hooks/api/use-vendor'
import type { Vendor, VendorFilters } from '#hooks/api/use-vendor'
import { VendorFormDialog } from '#components/maintenance/vendor-form-dialog'
import { Input } from '#components/ui/input'
import { Button } from '#components/ui/button'
import { Badge } from '#components/ui/badge'
import { Card, CardContent, CardHeader } from '#components/ui/card'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '#components/ui/dialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#components/ui/select'
import { Skeleton } from '#components/ui/skeleton'

const TRADE_LABELS: Record<string, string> = {
	plumbing: 'Plumbing',
	electrical: 'Electrical',
	hvac: 'HVAC',
	carpentry: 'Carpentry',
	painting: 'Painting',
	landscaping: 'Landscaping',
	appliance: 'Appliance Repair',
	general: 'General Contractor',
	other: 'Other',
}

function VendorCard({ vendor }: { vendor: Vendor }) {
	const deleteMutation = useDeleteVendorMutation()

	return (
		<Card className="relative">
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold truncate">{vendor.name}</h3>
						<Badge variant="secondary" className="mt-1 text-xs capitalize">
							{TRADE_LABELS[vendor.trade] ?? vendor.trade}
						</Badge>
					</div>
					<div className="flex items-center gap-1 shrink-0">
						<VendorFormDialog vendor={vendor} />
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="text-destructive hover:text-destructive min-h-11"
									aria-label={`Delete ${vendor.name}`}
								>
									<Trash2 className="size-4" />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Remove vendor?</AlertDialogTitle>
									<AlertDialogDescription>
										This will remove <strong>{vendor.name}</strong> from your vendor list.
										Existing maintenance requests with this vendor will retain their
										assignment.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										onClick={() => deleteMutation.mutate(vendor.id)}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										Remove
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-2">
				{vendor.email && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Mail className="size-3.5 shrink-0" />
						<span className="truncate">{vendor.email}</span>
					</div>
				)}
				{vendor.phone && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Phone className="size-3.5 shrink-0" />
						<span>{vendor.phone}</span>
					</div>
				)}
				{vendor.hourly_rate && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<DollarSign className="size-3.5 shrink-0" />
						<span>${vendor.hourly_rate}/hour</span>
					</div>
				)}
				{vendor.notes && (
					<p className="text-xs text-muted-foreground line-clamp-2 pt-1">{vendor.notes}</p>
				)}
			</CardContent>
		</Card>
	)
}

function VendorsSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: 6 }).map((_, i) => (
				<Card key={i}>
					<CardHeader className="pb-2">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-4 w-20 mt-1" />
					</CardHeader>
					<CardContent className="space-y-2">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-24" />
					</CardContent>
				</Card>
			))}
		</div>
	)
}

export function VendorsPageClient() {
	const [search, setSearch] = useState('')
	const [tradeFilter, setTradeFilter] = useState<string>('all')

	const filters: VendorFilters = {
		...(search ? { search } : {}),
		...(tradeFilter !== 'all' ? { trade: tradeFilter } : {}),
	}

	const { data, isLoading } = useVendors(filters)

	const vendors = data?.data ?? []
	const total = data?.total ?? 0

	return (
		<div className="space-y-6 p-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<Building2 className="size-6 text-primary" />
					<div>
						<h1 className="text-2xl font-bold">Vendors</h1>
						<p className="text-sm text-muted-foreground">
							{total > 0 ? `${total} vendor${total !== 1 ? 's' : ''}` : 'No vendors yet'}
						</p>
					</div>
				</div>
				<VendorFormDialog />
			</div>

			<div className="flex flex-col gap-3 sm:flex-row">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						value={search}
						onChange={e => setSearch(e.target.value)}
						placeholder="Search vendors..."
						className="pl-9 h-11"
					/>
				</div>
				<Select value={tradeFilter} onValueChange={setTradeFilter}>
					<SelectTrigger className="w-full sm:w-48 h-11">
						<SelectValue placeholder="All trades" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All trades</SelectItem>
						{Object.entries(TRADE_LABELS).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{isLoading ? (
				<VendorsSkeleton />
			) : vendors.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<Building2 className="size-12 text-muted-foreground/40 mb-4" />
					<h3 className="font-semibold text-lg">
						{search || tradeFilter !== 'all'
							? 'No vendors match your filters'
							: 'No vendors yet'}
					</h3>
					<p className="text-sm text-muted-foreground mt-1 mb-6">
						{search || tradeFilter !== 'all'
							? 'Try different search terms or filters.'
							: 'Add your first vendor to start tracking contractors.'}
					</p>
					{!search && tradeFilter === 'all' && <VendorFormDialog />}
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{vendors.map(vendor => (
						<VendorCard key={vendor.id} vendor={vendor} />
					))}
				</div>
			)}
		</div>
	)
}
