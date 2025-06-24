import React from 'react';
import { Image } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormSection } from '@/components/common/BaseFormModal';
import { UseFormReturn } from 'react-hook-form';
import { PropertyFormData } from '@/hooks/usePropertyFormData';

interface PropertyMediaSectionProps {
  form: UseFormReturn<PropertyFormData>;
}

/**
 * Property media section component
 * Handles property image URL and future file upload functionality
 */
export function PropertyMediaSection({ form }: PropertyMediaSectionProps) {
  const imageUrl = form.watch('imageUrl');

  return (
    <FormSection icon={Image} title="Property Photo" delay={3}>
      {/* Image URL Input */}
      <div className="space-y-2">
        <Label htmlFor="imageUrl" className="text-sm font-medium text-gray-700">
          Property Image URL (Optional)
        </Label>
        <div className="relative">
          <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="imageUrl"
            type="url"
            placeholder="e.g., https://example.com/property-photo.jpg"
            className="pl-10 transition-colors focus:border-blue-500"
            {...form.register('imageUrl')}
          />
        </div>
        {form.formState.errors.imageUrl && (
          <p className="text-sm text-red-600">{form.formState.errors.imageUrl.message}</p>
        )}
      </div>

      {/* Image Preview */}
      {imageUrl && imageUrl.trim() !== '' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Preview</Label>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <img
              src={imageUrl}
              alt="Property preview"
              className="w-full h-48 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const errorDiv = target.nextElementSibling as HTMLDivElement;
                if (errorDiv) {
                  errorDiv.style.display = 'flex';
                }
              }}
            />
            <div 
              className="hidden w-full h-48 bg-gray-100 items-center justify-center border-2 border-dashed border-gray-300"
            >
              <div className="text-center">
                <Image className="mx-auto h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-500 mt-1">Failed to load image</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Future Upload Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <Image className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">Coming Soon: File Upload</p>
            <p className="text-blue-700">
              Soon you'll be able to upload photos directly from your device. For now, you can use an image URL.
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        📸 A good property photo helps tenants identify your property and makes it look more professional.
      </p>
    </FormSection>
  );
}