'use client'

import { PropertyImageGallery } from '../property-image-gallery'
import { PropertyImageDropzone } from '../property-image-dropzone'

interface PropertyImagesEditSectionProps {
	propertyId: string
}

export function PropertyImagesEditSection({
	propertyId
}: PropertyImagesEditSectionProps) {
	return (
		<div className="space-y-4 border rounded-lg p-6">
			<h3 className="typography-large">Property Images</h3>
			<p className="text-muted">
				Manage your property photos. First uploaded image appears on property
				card.
			</p>

			<PropertyImageGallery propertyId={propertyId} editable={true} />

			<div className="border-t pt-4 mt-4">
				<h4 className="typography-small mb-4">Add New Images</h4>
				<PropertyImageDropzone propertyId={propertyId} />
			</div>
		</div>
	)
}
