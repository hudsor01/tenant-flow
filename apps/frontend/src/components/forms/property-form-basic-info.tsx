'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Property } from '@repo/shared';
import type { PropertyFormState } from '@/lib/actions/property-actions';

interface PropertyFormBasicInfoProps {
  property?: Property;
  errors?: PropertyFormState['errors'];
}

const propertyTypes = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'multi_family', label: 'Multi Family' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'commercial', label: 'Commercial' },
] as const;

export function PropertyFormBasicInfo({ property, errors }: PropertyFormBasicInfoProps) {
  return (
    <div className="space-y-6">
      {/* Property Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Property Name *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={property?.name || ''}
          placeholder="Enter property name"
          required
          className={errors?.name ? 'border-destructive' : ''}
        />
        {errors?.name && (
          <p className="text-sm text-destructive">{errors.name[0]}</p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Textarea
          id="address"
          name="address"
          defaultValue={property?.address || ''}
          placeholder="Enter complete address"
          required
          rows={3}
          className={errors?.address ? 'border-destructive' : ''}
        />
        {errors?.address && (
          <p className="text-sm text-destructive">{errors.address[0]}</p>
        )}
      </div>

      {/* Property Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Property Type *</Label>
        <Select name="type" defaultValue={property?.propertyType || ''} required>
          <SelectTrigger className={errors?.type ? 'border-destructive' : ''}>
            <SelectValue placeholder="Select property type" />
          </SelectTrigger>
          <SelectContent>
            {propertyTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.type && (
          <p className="text-sm text-destructive">{errors.type[0]}</p>
        )}
      </div>

      {/* Number of Units */}
      <div className="space-y-2">
        <Label htmlFor="units">Number of Units *</Label>
        <Input
          id="units"
          name="units"
          type="number"
          min="1"
          defaultValue={property?.units?.length?.toString() || '1'}
          placeholder="Enter number of units"
          required
          className={errors?.units ? 'border-destructive' : ''}
        />
        {errors?.units && (
          <p className="text-sm text-destructive">{errors.units[0]}</p>
        )}
      </div>
    </div>
  );
}