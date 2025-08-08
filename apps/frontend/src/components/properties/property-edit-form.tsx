'use client';

import { PropertyFormClient } from '@/components/forms/property-form-client';
import type { Property } from '@repo/shared';

interface PropertyEditFormProps {
  property: Property;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PropertyEditForm({ property, onSuccess, onCancel }: PropertyEditFormProps) {
  return (
    <PropertyFormClient 
      property={property}
      mode="edit"
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}