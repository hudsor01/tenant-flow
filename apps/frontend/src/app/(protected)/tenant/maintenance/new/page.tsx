/**
 * Submit New Maintenance Request
 *
 * Form for tenants to submit maintenance requests
 */

'use client'

import { ImageUpload } from '@/components/maintenance/image-upload'
import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { Field, FieldLabel } from '@/components/ui/field'
import { useCurrentLease } from '@/hooks/api/use-lease'
import { useCreateMaintenanceRequest } from '@/hooks/api/use-maintenance'
import { logger } from '@repo/shared/lib/frontend-logger'
import type { CreateMaintenanceRequest } from '@repo/shared/types/backend-domain'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export default function NewMaintenanceRequestPage() {
	const router = useRouter()
	const createRequest = useCreateMaintenanceRequest()
	const { data: currentLease } = useCurrentLease()

	// Form state
	const [formData, setFormData] = useState({
		title: '',
		category: '',
		priority: '',
		description: '',
		location: ''
	})
	const [photoUrls, setPhotoUrls] = useState<string[]>([])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		// Validation
		if (!formData.title.trim()) {
			toast.error('Please enter a title')
			return
		}
		if (!formData.category) {
			toast.error('Please select a category')
			return
		}
		if (!formData.priority) {
			toast.error('Please select a priority')
			return
		}
		if (!formData.description.trim()) {
			toast.error('Please enter a description')
			return
		}

		// Map priority to match backend enum
		const priorityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'> = {
			low: 'LOW',
			medium: 'MEDIUM',
			high: 'HIGH',
			urgent: 'URGENT'
		}

		// Map category to match backend enum
		const categoryMap: Record<
			string,
			| 'PLUMBING'
			| 'ELECTRICAL'
			| 'HVAC'
			| 'APPLIANCES'
			| 'SAFETY'
			| 'GENERAL'
			| 'OTHER'
		> = {
			plumbing: 'PLUMBING',
			electrical: 'ELECTRICAL',
			hvac: 'HVAC',
			appliance: 'APPLIANCES',
			structural: 'SAFETY',
			pest: 'GENERAL', // Map pest to GENERAL or create new enum value
			other: 'OTHER'
		}

		// Get unitId from current tenant's lease
		if (!currentLease?.unitId) {
			toast.error(
				'No active lease found. Please contact your property manager.'
			)
			return
		}

		const requestData: CreateMaintenanceRequest = {
			unitId: currentLease.unitId,
			title: formData.title,
			description: formData.description,
			priority: priorityMap[formData.priority] || 'MEDIUM',
			category: categoryMap[formData.category] || 'GENERAL'
		}
		if (photoUrls.length > 0) {
			requestData.photos = photoUrls
		}

		try {
			await createRequest.mutateAsync(requestData)
			toast.success('Maintenance request submitted successfully')
			router.push('/tenant/maintenance')
		} catch (error) {
			logger.error('Failed to submit maintenance request', {
				action: 'create_maintenance_request',
				metadata: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			})
			toast.error('Failed to submit maintenance request')
		}
	}

	const handleChange = (field: keyof typeof formData, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }))
	}

	return (
		<div className="max-w-2xl mx-auto space-y-8">
			<div>
				<Link href="/tenant/maintenance">
					<Button variant="ghost" size="sm" className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Requests
					</Button>
				</Link>
				<h1 className="text-3xl font-bold tracking-tight">
					Submit Maintenance Request
				</h1>
				<p className="text-muted-foreground mt-2">
					Describe the issue and we'll get it fixed as soon as possible
				</p>
			</div>

			<CardLayout title="Request Details">
				<form onSubmit={handleSubmit} className="space-y-6">
					<Field>
						<FieldLabel>Issue Title *</FieldLabel>
						<input
							type="text"
							className="input w-full"
							placeholder="e.g., Leaky faucet in bathroom"
							value={formData.title}
							onChange={e => handleChange('title', e.target.value)}
							required
						/>
					</Field>

					<Field>
						<FieldLabel>Category *</FieldLabel>
						<select
							className="input w-full"
							value={formData.category}
							onChange={e => handleChange('category', e.target.value)}
							required
						>
							<option value="">Select category...</option>
							<option value="plumbing">Plumbing</option>
							<option value="electrical">Electrical</option>
							<option value="hvac">Heating/Cooling</option>
							<option value="appliance">Appliance</option>
							<option value="structural">Structural</option>
							<option value="pest">Pest Control</option>
							<option value="other">Other</option>
						</select>
					</Field>

					<Field>
						<FieldLabel>Priority *</FieldLabel>
						<select
							className="input w-full"
							value={formData.priority}
							onChange={e => handleChange('priority', e.target.value)}
							required
						>
							<option value="">Select priority...</option>
							<option value="low">Low - Can wait a few days</option>
							<option value="medium">Medium - Should be addressed soon</option>
							<option value="high">High - Needs attention this week</option>
							<option value="urgent">Urgent - Safety/health concern</option>
						</select>
					</Field>

					<Field>
						<FieldLabel>Description *</FieldLabel>
						<textarea
							className="input w-full min-h-[120px]"
							placeholder="Please describe the issue in detail..."
							value={formData.description}
							onChange={e => handleChange('description', e.target.value)}
							required
						/>
					</Field>

					<Field>
						<FieldLabel>Location in Unit</FieldLabel>
						<input
							type="text"
							className="input w-full"
							placeholder="e.g., Master bathroom, Kitchen sink"
							value={formData.location}
							onChange={e => handleChange('location', e.target.value)}
						/>
					</Field>

					{/* Image Upload */}
					<ImageUpload onUploadComplete={setPhotoUrls} maxImages={5} />

					<div className="flex gap-4 pt-4">
						<Link href="/tenant/maintenance" className="flex-1">
							<Button
								type="button"
								variant="outline"
								className="w-full"
								disabled={createRequest.isPending}
							>
								Cancel
							</Button>
						</Link>
						<Button
							type="submit"
							className="flex-1"
							disabled={createRequest.isPending}
						>
							{createRequest.isPending ? 'Submitting...' : 'Submit Request'}
						</Button>
					</div>
				</form>
			</CardLayout>
		</div>
	)
}
