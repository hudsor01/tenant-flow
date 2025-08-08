'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyFormBasicInfo } from './property-form-basic-info';
import { PropertyFormFeatures } from './property-form-features';
import { PropertyFormActions } from './property-form-actions';
import { usePropertyFormServer } from '@/hooks/use-property-form-server';
import type { Property } from '@repo/shared';

interface PropertyFormClientProps {
  property?: Property;
  mode?: 'create' | 'edit';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PropertyFormClient({ property, mode = 'create', onSuccess, onCancel }: PropertyFormClientProps) {
  const { 
    formState, 
    isPending, 
    handleSubmit, 
    amenities: _amenities,
    updateAmenities 
  } = usePropertyFormServer({ property, mode, onSuccess });

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Add New Property' : 'Edit Property'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-8">
          {/* Basic Property Information */}
          <PropertyFormBasicInfo 
            property={property}
            errors={formState.errors}
          />

          {/* Property Features */}
          <PropertyFormFeatures 
            property={property}
            errors={formState.errors}
            onAmenitiesChange={updateAmenities}
          />

          {/* Form Actions and Error Display */}
          <PropertyFormActions 
            mode={mode}
            isPending={isPending}
            errors={formState.errors}
            onCancel={onCancel}
          />
        </form>
      </CardContent>
    </Card>
  );
}