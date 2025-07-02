import React from 'react';
import { Building2, AlertCircle, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormSection } from '@/components/common/BaseFormModal';
import { UseFormReturn } from 'react-hook-form';
import { InviteTenantForm } from '@/hooks/useInviteTenantForm';
import type { Property, Unit } from '@/types/supabase-generated';

interface PropertyAssignmentSectionProps {
  form: UseFormReturn<InviteTenantForm>;
  properties: Property[];
  propertiesLoading: boolean;
  propertiesError: Error | null;
  selectedPropertyId?: string;
  selectedProperty: string;
  units: Unit[];
  unitsLoading: boolean;
  onClose: () => void;
}

/**
 * Property assignment section component for the invite tenant modal
 * Handles property and unit selection
 */
export function PropertyAssignmentSection({
  form,
  properties,
  propertiesLoading,
  propertiesError,
  selectedPropertyId,
  selectedProperty,
  units,
  unitsLoading,
  onClose,
}: PropertyAssignmentSectionProps) {
  return (
    <FormSection icon={Building2} title="Property Assignment" delay={1}>
      {/* Property Selection Error */}
      {propertiesError && (propertiesError as { code?: string }).code !== 'PGRST116' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load properties. Please close and try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Property Selection */}
      <div className="space-y-2">
        <Label htmlFor="propertyId" className="text-sm font-medium text-gray-700">
          Select Property *
        </Label>
        <select
          id="propertyId"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors focus:border-green-500"
          disabled={propertiesLoading || !!selectedPropertyId || !!propertiesError}
          {...form.register('propertyId')}
        >
          <option value="">
            {propertiesLoading ? 'Loading properties...' : 'Choose a property...'}
          </option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name} - {property.address}, {property.city}, {property.state}
            </option>
          ))}
        </select>
        {form.formState.errors.propertyId && (
          <p className="text-sm text-red-600">{form.formState.errors.propertyId.message}</p>
        )}
        {selectedPropertyId && (
          <p className="text-xs text-green-600 font-medium">
            ✓ Property pre-selected from current context
          </p>
        )}
        {properties.length === 0 && !propertiesLoading && (
          <Alert className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">No properties yet!</span> You need to create a property first before inviting tenants.
              <Button 
                type="button"
                variant="link" 
                className="p-0 h-auto font-medium ml-1"
                onClick={() => {
                  onClose();
                  // Navigate to properties page to create one
                  window.location.href = '/properties';
                }}
              >
                Create your first property →
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Unit Selection */}
      {selectedProperty && (
        <div className="space-y-2">
          <Label htmlFor="unitId" className="text-sm font-medium text-gray-700">
            Select Unit (Optional)
          </Label>
          <select
            id="unitId"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors focus:border-green-500"
            disabled={unitsLoading}
            {...form.register('unitId')}
          >
            <option value="">
              {unitsLoading ? 'Loading units...' : 'Choose a unit (optional)...'}
            </option>
            {units
              .filter(unit => unit.status === 'VACANT' || unit.status === 'RESERVED')
              .map((unit) => (
                <option key={unit.id} value={unit.id}>
                  Unit {unit.unitNumber} - {unit.bedrooms}bd/{unit.bathrooms}ba - ${unit.rent}/month
                </option>
              ))}
          </select>
          
          {/* No Units Available - Helpful Message */}
          {!unitsLoading && units.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
              <div className="flex items-start space-x-2">
                <Building2 className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 mb-1">No units created yet</p>
                  <p className="text-amber-700 mb-2">
                    This property doesn't have any units yet. You can still invite the tenant and assign them to a unit later.
                  </p>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => {
                      onClose();
                      // Navigate to property detail page to add units
                      window.location.href = `/properties/${selectedProperty}`;
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create units first
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-500">
            {units.length > 0 
              ? 'Leave blank to assign unit later. Only vacant and reserved units are shown.'
              : 'You can create units after sending the invitation by going to the property details page.'
            }
          </p>
        </div>
      )}
    </FormSection>
  );
}