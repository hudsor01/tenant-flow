'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, PenLine } from 'lucide-react'
import Link from 'next/link'
import { Button } from '#components/ui/button'
import { Badge } from '#components/ui/badge'
import { Label } from '#components/ui/label'
import { Textarea } from '#components/ui/textarea'
import { Skeleton } from '#components/ui/skeleton'
import { useInspection, useTenantReview } from '#hooks/api/use-inspections'
import { formatDate } from '#lib/formatters/date'
import type { InspectionRoom } from '@repo/shared/types/sections/inspections'

const CONDITION_LABELS: Record<string, string> = {
	excellent: 'Excellent',
	good: 'Good',
	fair: 'Fair',
	poor: 'Poor',
	damaged: 'Damaged'
}

type ConditionVariant = 'success' | 'info' | 'warning' | 'destructive' | 'outline'

function conditionVariant(rating: string): ConditionVariant {
	switch (rating) {
		case 'excellent':
			return 'success'
		case 'good':
			return 'info'
		case 'fair':
			return 'warning'
		case 'poor':
		case 'damaged':
			return 'destructive'
		default:
			return 'outline'
	}
}

function RoomSummary({ room }: { room: InspectionRoom }) {
	const photos = room.photos ?? []

	return (
		<div className="rounded-lg border bg-card p-4 space-y-3">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="font-medium text-sm">{room.room_name}</p>
					<p className="text-xs text-muted-foreground capitalize">
						{room.room_type.replace('_', ' ')}
					</p>
				</div>
				<Badge variant={conditionVariant(room.condition_rating)} size="sm">
					{CONDITION_LABELS[room.condition_rating] ?? room.condition_rating}
				</Badge>
			</div>

			{room.notes && (
				<p className="text-sm text-muted-foreground">{room.notes}</p>
			)}

			{photos.length > 0 && (
				<div className="grid grid-cols-4 gap-1.5">
					{photos.slice(0, 8).map(photo => (
						<div
							key={photo.id}
							className="aspect-square rounded bg-muted overflow-hidden"
						>
							<img
								src={`/api/v1/inspections/photos/${photo.id}/url`}
								alt={photo.file_name}
								className="w-full h-full object-cover"
								loading="lazy"
							/>
						</div>
					))}
					{photos.length > 8 && (
						<div className="aspect-square rounded bg-muted flex items-center justify-center">
							<span className="text-xs text-muted-foreground">
								+{photos.length - 8}
							</span>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

export default function TenantInspectionPage() {
	const params = useParams()
	const router = useRouter()
	const id = params.id as string

	const { data: inspection, isLoading, error } = useInspection(id)
	const tenantReview = useTenantReview(id)

	const [tenantNotes, setTenantNotes] = useState('')
	const [agreed, setAgreed] = useState(false)

	if (isLoading) {
		return (
			<div className="space-y-6 max-w-2xl mx-auto">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-48 w-full" />
				<Skeleton className="h-32 w-full" />
			</div>
		)
	}

	if (error || !inspection) {
		return (
			<div className="text-center py-12">
				<p className="text-sm text-destructive">
					Inspection not found or you do not have access.
				</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => router.back()}
					className="mt-4"
				>
					Go Back
				</Button>
			</div>
		)
	}

	const rooms = inspection.rooms ?? []
	const typeLabel =
		inspection.inspection_type === 'move_in' ? 'Move-In' : 'Move-Out'
	const isAlreadyReviewed =
		inspection.status === 'finalized' ||
		!!inspection.tenant_reviewed_at

	async function handleSubmitReview() {
		if (!agreed) return

		await tenantReview.mutateAsync({
			tenant_notes: tenantNotes || null,
			tenant_signature_data: `agreed:${new Date().toISOString()}`
		})
	}

	return (
		<div className="space-y-8 max-w-2xl mx-auto">
			{/* Header */}
			<div className="flex items-start gap-4">
				<Link
					href="/tenant"
					className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
					aria-label="Back to tenant portal"
				>
					<ArrowLeft className="w-5 h-5" aria-hidden="true" />
				</Link>
				<div className="flex-1 min-w-0">
					<h1 className="text-xl font-semibold">
						{typeLabel} Inspection Review
					</h1>
					<div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
						<span>
							{(inspection as { property?: { name?: string } }).property?.name ?? 'Property'}
						</span>
						{inspection.scheduled_date && (
							<>
								<span>·</span>
								<span>{formatDate(inspection.scheduled_date)}</span>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Overview */}
			{(inspection.overall_condition || inspection.owner_notes) && (
				<div className="rounded-lg border bg-card p-4 space-y-3">
					<h2 className="text-sm font-medium">Overview</h2>
					{inspection.overall_condition && (
						<div>
							<p className="text-xs text-muted-foreground">Overall condition</p>
							<p className="text-sm">{inspection.overall_condition}</p>
						</div>
					)}
					{inspection.owner_notes && (
						<div>
							<p className="text-xs text-muted-foreground">Owner notes</p>
							<p className="text-sm whitespace-pre-wrap">{inspection.owner_notes}</p>
						</div>
					)}
				</div>
			)}

			{/* Rooms */}
			{rooms.length > 0 && (
				<div className="space-y-3">
					<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
						Room Conditions ({rooms.length})
					</h2>
					{rooms.map(room => (
						<RoomSummary key={room.id} room={room} />
					))}
				</div>
			)}

			{/* Already reviewed */}
			{isAlreadyReviewed ? (
				<div className="rounded-lg border bg-muted/30 p-6 text-center space-y-2">
					<PenLine
						className="w-8 h-8 text-muted-foreground mx-auto"
						aria-hidden="true"
					/>
					<p className="text-sm font-medium">Inspection already reviewed</p>
					{inspection.tenant_reviewed_at && (
						<p className="text-xs text-muted-foreground">
							Signed {formatDate(inspection.tenant_reviewed_at, { relative: true })}
						</p>
					)}
					{inspection.tenant_notes && (
						<div className="mt-3 text-left p-3 bg-background rounded-md border">
							<p className="text-xs text-muted-foreground mb-1">Your notes</p>
							<p className="text-sm whitespace-pre-wrap">
								{inspection.tenant_notes}
							</p>
						</div>
					)}
				</div>
			) : (
				/* Review form */
				<div className="rounded-lg border bg-card p-6 space-y-6">
					<div>
						<h2 className="text-base font-medium mb-1">Your Review</h2>
						<p className="text-sm text-muted-foreground">
							Review the inspection details above, then sign to confirm.
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="tenant-notes">
							Your notes (optional)
						</Label>
						<Textarea
							id="tenant-notes"
							value={tenantNotes}
							onChange={e => setTenantNotes(e.target.value)}
							placeholder="Add any comments or disagreements about the inspection..."
							rows={4}
						/>
					</div>

					<div className="flex items-start gap-3">
						<input
							id="agree-checkbox"
							type="checkbox"
							checked={agreed}
							onChange={e => setAgreed(e.target.checked)}
							className="mt-0.5 h-4 w-4 rounded border-input"
						/>
						<label
							htmlFor="agree-checkbox"
							className="text-sm leading-relaxed cursor-pointer"
						>
							I confirm that I have reviewed this inspection report and the information is
							accurate to the best of my knowledge.
						</label>
					</div>

					<Button
						type="button"
						onClick={handleSubmitReview}
						disabled={!agreed || tenantReview.isPending}
						className="w-full min-h-11"
					>
						{tenantReview.isPending ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
								Submitting...
							</>
						) : (
							<>
								<PenLine className="w-4 h-4 mr-2" aria-hidden="true" />
								Sign and Submit
							</>
						)}
					</Button>
				</div>
			)}
		</div>
	)
}
