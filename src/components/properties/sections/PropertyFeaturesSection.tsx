import React from 'react';
import { Home, Car, Waves } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { FormSection } from '@/components/common/BaseFormModal';
import { UseFormReturn } from 'react-hook-form';
import { PropertyFormData } from '@/hooks/usePropertyFormData';

interface PropertyFeaturesSectionProps {
  form: UseFormReturn<PropertyFormData>;
}

/**
 * Property features section component
 * Handles amenities and property features (only shown in edit mode)
 */
export function PropertyFeaturesSection({ form }: PropertyFeaturesSectionProps) {
  return (
    <FormSection icon={Home} title="Property Features" delay={2}>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-4">
          Select the amenities and features available at this property:
        </p>

        <div className="space-y-3">
          {/* Garage */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="hasGarage"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              {...form.register('hasGarage')}
            />
            <div className="flex items-center space-x-2">
              <Car className="h-4 w-4 text-gray-600" />
              <Label htmlFor="hasGarage" className="text-sm text-gray-700 cursor-pointer">
                Garage or Covered Parking
              </Label>
            </div>
          </div>

          {/* Pool */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="hasPool"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              {...form.register('hasPool')}
            />
            <div className="flex items-center space-x-2">
              <Waves className="h-4 w-4 text-gray-600" />
              <Label htmlFor="hasPool" className="text-sm text-gray-700 cursor-pointer">
                Swimming Pool
              </Label>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          💡 These features will be displayed on lease documents and tenant portals.
        </p>
      </div>
    </FormSection>
  );
}