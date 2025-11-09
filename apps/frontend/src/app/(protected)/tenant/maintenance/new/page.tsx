/**
 * Submit New Maintenance Request
 *
 * Form for tenants to submit maintenance requests
 */

'use client'

import { TenantGuard } from '#components/auth/tenant-guard'
import { ImageUpload } from './image-upload'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Field, FieldLabel } from '#components/ui/field'
import { useCreateTenantMaintenanceRequest } from '#hooks/api/use-tenant-portal'
import { logger } from '@repo/shared/lib/frontend-logger'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export default function NewMaintenanceRequestPage() {
	const router = useRouter()
	const createRequest = useCreateTenantMaintenanceRequest()

	// Form state
	const [formData, setFormData] = useState({
		title: '',
		category: '',
		priority: '',
		description: '',
		allowEntry: true
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
			appliances: 'APPLIANCES',
			safety: 'SAFETY',
			general: 'GENERAL',
			other: 'OTHER'
		}

		const requestData = {
			title: formData.title,
			description: formData.description,
			priority: priorityMap[formData.priority] || 'MEDIUM',
			category: categoryMap[formData.category] || 'GENERAL',
			allowEntry: formData.allowEntry,
			photos: photoUrls
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

	const handleChange = (
		field: keyof typeof formData,
		value: string | boolean
	) => {
		setFormData(prev => ({ ...prev, [field]: value }))
	}

	return (
		<TenantGuard>
		<div className="max-w-2xl mx-auto space-y-8">
			<div>
				<Link href="/tenant/maintenance">
					<Button variant="ghost" size="sm" className="mb-4">
						<ArrowLeft className="size-4 mr-2" />
						Back to Requests
					</Button>
				</Link>
				<h1 className="text-3xl font-bold tracking-tight">
					Submit Maintenance Request
				</h1>
				<p className="text-muted-foreground mt-2">
					Describe the issue and we&apos;ll get it fixed as soon as possible
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
							<option value="hvac">Heating/Cooling (HVAC)</option>
							<option value="appliances">Appliances</option>
							<option value="safety">Safety/Structural</option>
							<option value="general">General Maintenance</option>
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
							className="input w-full min-h-[7.5rem]"
							placeholder="Please describe the issue in detail..."
							value={formData.description}
							onChange={e => handleChange('description', e.target.value)}
							required
						/>
					</Field>

					<Field>
						<div className="flex items-center gap-3">
							<input
								type="checkbox"
								id="allowEntry"
								checked={formData.allowEntry}
								onChange={e => handleChange('allowEntry', e.target.checked)}
								className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
							/>
							<FieldLabel htmlFor="allowEntry" className="mb-0 cursor-pointer">
								Allow maintenance team to enter unit if I&apos;m not home
							</FieldLabel>
						</div>
						<p className="text-sm text-muted-foreground mt-1">
							Check this box if maintenance can access your unit without you being present
						</p>
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
		</TenantGuard>
	)
}
