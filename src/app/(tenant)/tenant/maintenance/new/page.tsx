'use client'

import type { FormEvent } from 'react'

import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { CardLayout } from '#components/ui/card-layout'
import { Field, FieldLabel } from '#components/ui/field'
import { useMaintenanceRequestCreateMutation } from '#hooks/api/use-tenant-maintenance'
import { handleMutationError } from '#lib/mutation-error-handler'
import { ArrowLeft, Camera, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILES = 5
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export default function NewMaintenanceRequestPage() {
	const router = useRouter()
	const createRequest = useMaintenanceRequestCreateMutation()

	const [formData, setFormData] = useState({
		title: '',
		category: '',
		priority: '',
		description: '',
		allowEntry: true
	})

	const [stagedFiles, setStagedFiles] = useState<File[]>([])

	const handleFilesSelected = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selected = Array.from(e.target.files ?? [])
			const valid = selected.filter(f => {
				if (!ACCEPTED_TYPES.includes(f.type)) {
					toast.error(`${f.name}: unsupported file type`)
					return false
				}
				if (f.size > MAX_SIZE) {
					toast.error(`${f.name}: exceeds 5MB limit`)
					return false
				}
				return true
			})

			setStagedFiles(prev => {
				const combined = [...prev, ...valid]
				if (combined.length > MAX_FILES) {
					toast.error(`Maximum ${MAX_FILES} photos allowed`)
					return combined.slice(0, MAX_FILES)
				}
				return combined
			})

			// Reset input so same file can be re-selected
			e.target.value = ''
		},
		[]
	)

	const removeFile = useCallback((index: number) => {
		setStagedFiles(prev => prev.filter((_, i) => i !== index))
	}, [])

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()

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

		const priorityMap: Record<string, 'low' | 'normal' | 'high' | 'urgent'> = {
			low: 'low', medium: 'normal', high: 'high', urgent: 'urgent'
		}
		const categoryMap: Record<string, 'PLUMBING' | 'ELECTRICAL' | 'HVAC' | 'APPLIANCES' | 'SAFETY' | 'GENERAL' | 'OTHER'> = {
			plumbing: 'PLUMBING', electrical: 'ELECTRICAL', hvac: 'HVAC', appliances: 'APPLIANCES',
			safety: 'SAFETY', general: 'GENERAL', other: 'OTHER'
		}

		const requestData = {
			title: formData.title,
			description: formData.description,
			priority: priorityMap[formData.priority] || 'normal',
			category: categoryMap[formData.category] || 'GENERAL',
			allowEntry: formData.allowEntry,
			...(stagedFiles.length > 0 ? { stagedFiles } : {})
		}

		try {
			await createRequest.mutateAsync(requestData)
			toast.success('Maintenance request submitted successfully')
			router.push('/tenant/maintenance')
		} catch (error) {
			handleMutationError(error, 'Submit maintenance request')
		}
	}

	const handleChange = (
		field: keyof typeof formData,
		value: string | boolean
	) => {
		setFormData(prev => ({ ...prev, [field]: value }))
	}

	return (
		<div className="max-w-2xl mx-auto space-y-8">
			<div>
				<Link href="/tenant/maintenance">
					<Button variant="ghost" size="sm" className="mb-4">
						<ArrowLeft className="size-4 mr-2" />
						Back to Requests
					</Button>
				</Link>
				<h1 className="typography-h2 tracking-tight">
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
						<Input
							type="text"
							placeholder="e.g., Leaky faucet in bathroom"
							value={formData.title}
							onChange={e => handleChange('title', e.target.value)}
							required
						/>
					</Field>

					<Field>
						<FieldLabel>Category *</FieldLabel>
						<Select
							value={formData.category}
							onValueChange={value => handleChange('category', value)}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select category..." />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="plumbing">Plumbing</SelectItem>
								<SelectItem value="electrical">Electrical</SelectItem>
								<SelectItem value="hvac">Heating/Cooling (HVAC)</SelectItem>
								<SelectItem value="appliances">Appliances</SelectItem>
								<SelectItem value="safety">Safety/Structural</SelectItem>
								<SelectItem value="general">General Maintenance</SelectItem>
								<SelectItem value="other">Other</SelectItem>
							</SelectContent>
						</Select>
					</Field>

					<Field>
						<FieldLabel>Priority *</FieldLabel>
						<Select
							value={formData.priority}
							onValueChange={value => handleChange('priority', value)}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select priority..." />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="low">Low - Can wait a few days</SelectItem>
								<SelectItem value="medium">Medium - Should be addressed soon</SelectItem>
								<SelectItem value="high">High - Needs attention this week</SelectItem>
								<SelectItem value="urgent">Urgent - Safety/health concern</SelectItem>
							</SelectContent>
						</Select>
					</Field>

					<Field>
						<FieldLabel>Description *</FieldLabel>
						<textarea
							className="input w-full min-h-30"
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
						<p className="text-muted-foreground mt-1">
							Check this box if maintenance can access your unit without you
							being present
						</p>
					</Field>

					<Field>
						<FieldLabel>Photos (Optional, max {MAX_FILES})</FieldLabel>
						<div className="space-y-3">
							{stagedFiles.length > 0 && (
								<div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
									{stagedFiles.map((file, index) => (
										<div key={`${file.name}-${index}`} className="relative group">
											<img
												src={URL.createObjectURL(file)}
												alt={file.name}
												className="rounded-md object-cover aspect-square w-full"
											/>
											<button
												type="button"
												onClick={() => removeFile(index)}
												className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
												aria-label={`Remove ${file.name}`}
											>
												<X className="size-3.5" />
											</button>
										</div>
									))}
								</div>
							)}

							{stagedFiles.length < MAX_FILES && (
								<label className="flex items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors">
									<Camera className="size-5 text-muted-foreground" />
									<span className="text-sm text-muted-foreground">
										{stagedFiles.length === 0 ? 'Add photos' : 'Add more photos'}
									</span>
									<input
										type="file"
										accept="image/jpeg,image/png,image/webp"
										multiple
										onChange={handleFilesSelected}
										className="sr-only"
									/>
								</label>
							)}
						</div>
					</Field>

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
