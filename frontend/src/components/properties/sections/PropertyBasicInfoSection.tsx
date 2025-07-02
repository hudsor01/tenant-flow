import React from 'react';
import { Building2, Home, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormSection } from '@/components/common/BaseFormModal';
import { UseFormReturn } from 'react-hook-form';
import { PropertyFormData } from '@/hooks/usePropertyFormData';

interface PropertyBasicInfoSectionProps {
  form: UseFormReturn<PropertyFormData>;
  propertyType: string;
  numberOfUnits?: number;
  mode: 'create' | 'edit';
}

/**
 * Property basic information section component
 * Handles property name, type selection, and unit configuration
 */
export function PropertyBasicInfoSection({ 
  form, 
  propertyType, 
  numberOfUnits, 
  mode 
}: PropertyBasicInfoSectionProps) {
  return (
    <FormSection icon={Building2} title="Basic Information" delay={0}>
      {/* Property Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-gray-700">
          Property Name *
        </Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="name"
            placeholder="e.g., Sunset Apartments, 123 Main St"
            className="pl-10 transition-colors focus:border-blue-500"
            {...form.register('name')}
          />
        </div>
        {form.formState.errors.name && (
          <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Property Type */}
      <div className="space-y-2">
        <Label htmlFor="propertyType" className="text-sm font-medium text-gray-700">
          Property Type *
        </Label>
        <select
          id="propertyType"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors focus:border-blue-500"
          {...form.register('propertyType')}
        >
          <option value="SINGLE_FAMILY">Single Family Home</option>
          <option value="MULTI_UNIT">Multi-Unit Building</option>
          <option value="APARTMENT">Apartment Complex</option>
          <option value="COMMERCIAL">Commercial Property</option>
        </select>
        {form.formState.errors.propertyType && (
          <p className="text-sm text-red-600">{form.formState.errors.propertyType.message}</p>
        )}
      </div>

      {/* Multi-Unit Configuration - Only show in create mode */}
      {mode === 'create' && (propertyType === 'MULTI_UNIT' || propertyType === 'APARTMENT') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">Multi-Unit Configuration</h4>
          </div>

          {/* Number of Units */}
          <div className="space-y-2">
            <Label htmlFor="numberOfUnits" className="text-sm font-medium text-gray-700">
              How many units does this property have?
            </Label>
            <Input
              id="numberOfUnits"
              type="number"
              min="1"
              max="500"
              placeholder="e.g., 4"
              className="transition-colors focus:border-blue-500"
              {...form.register('numberOfUnits', { valueAsNumber: true })}
            />
            {form.formState.errors.numberOfUnits && (
              <p className="text-sm text-red-600">{form.formState.errors.numberOfUnits.message}</p>
            )}
          </div>

          {/* Create Units Now Option */}
          {numberOfUnits && numberOfUnits > 0 && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="createUnitsNow"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                {...form.register('createUnitsNow')}
              />
              <Label htmlFor="createUnitsNow" className="text-sm text-gray-700 cursor-pointer">
                Create {numberOfUnits} basic units now (you can edit details later)
              </Label>
            </div>
          )}

          <p className="text-xs text-blue-600">
            💡 You can always add or modify units later from the property details page.
          </p>
        </div>
      )}

      {/* Edit Mode Unit Count Display */}
      {mode === 'edit' && (propertyType === 'MULTI_UNIT' || propertyType === 'APARTMENT') && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Home className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-700">
              This property has {numberOfUnits || 0} units. Manage units from the property details page.
            </span>
          </div>
        </div>
      )}
    </FormSection>
  );
}