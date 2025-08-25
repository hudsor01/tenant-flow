import { Image as ImageIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import NextImage from 'next/image'
import { FormSection } from '@/components/modals/base-form-modal'
import type { UseFormReturn } from 'react-hook-form'
import type { PropertyFormData } from '@repo/shared/validation'

interface PropertyMediaSectionProps {
	form: UseFormReturn<PropertyFormData>
}

/**
 * Property media section component
 * Handles property image URL and future file upload functionality
 */
export function PropertyMediaSection({
	form
}: Readonly<PropertyMediaSectionProps>) {
	const imageUrl = form.watch('imageUrl')

	return (
		<FormSection icon={Image} title="Property Photo" delay={3}>
			{/* Image URL Input */}
			<div className="space-y-2">
				<Label
					htmlFor="imageUrl"
					className="text-sm font-medium text-gray-700"
				>
					Property Image URL (Optional)
				</Label>
				<div className="relative">
					<ImageIcon
						className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400"
						aria-hidden="true"
					/>
					<Input
						id="imageUrl"
						type="url"
						placeholder="e.g., https://tenantflow.app/property-photo.jpg"
						className="focus:border-primary pl-10 transition-colors"
						{...form.register('imageUrl')}
					/>
				</div>
				{form.formState.errors.imageUrl && (
					<p className="text-sm text-red-600">
						{form.formState.errors.imageUrl.message}
					</p>
				)}
			</div>

			{/* Image Preview */}
			{imageUrl && imageUrl.trim() !== '' && (
				<div className="space-y-2">
					<Label className="text-sm font-medium text-gray-700">
						Preview
					</Label>
					<div className="overflow-hidden rounded-lg border border-gray-200">
						<NextImage
							src={imageUrl}
							alt="Property preview"
							width={400}
							height={192}
							className="h-48 w-full object-cover"
							onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
								const target = e.target as HTMLImageElement
								target.style.display = 'none'
								const parentElement =
									target.parentNode as Element | null
								const errorDiv =
									parentElement?.nextElementSibling as HTMLDivElement | null
								if (errorDiv) {
									errorDiv.style.display = 'flex'
								}
							}}
						/>
						<div className="hidden h-48 w-full items-center justify-center border-2 border-dashed border-gray-300 bg-gray-100">
							<div className="text-center">
								<ImageIcon
									className="mx-auto h-8 w-8 text-gray-400"
									aria-hidden="true"
								/>
								<p className="mt-1 text-sm text-gray-500">
									Failed to load image
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Future Upload Section */}
			<div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
				<div className="flex items-start space-x-2">
					<ImageIcon
						className="text-primary mt-0.5 h-4 w-4"
						aria-hidden="true"
					/>
					<div className="text-sm">
						<p className="mb-1 font-medium text-blue-900">
							Coming Soon: File Upload
						</p>
						<p className="text-blue-700">
							Soon you&apos;ll be able to upload photos directly
							from your device. For now, you can use an image URL.
						</p>
					</div>
				</div>
			</div>

			<p className="text-xs text-gray-500">
				📸 A good property photo helps tenants identify your property
				and makes it look more .
			</p>
		</FormSection>
	)
}
