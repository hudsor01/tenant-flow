'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import type { Property } from '@repo/shared';
import type { PropertyFormState } from '@/lib/actions/property-actions';

interface PropertyFormFeaturesProps {
  property?: Property;
  errors?: PropertyFormState['errors'];
  onAmenitiesChange?: (amenities: string[]) => void;
}

interface AmenityTagProps {
  amenity: string;
  onRemove: () => void;
}

function AmenityTag({ amenity, onRemove }: AmenityTagProps) {
  return (
    <div className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-sm">
      <span>{amenity}</span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-4 w-4 p-0 hover:bg-transparent"
        onClick={onRemove}
        aria-label={`Remove ${amenity} amenity`}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface AmenityInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
}

function AmenityInput({ value, onChange, onAdd }: AmenityInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAdd();
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add an amenity"
        onKeyDown={handleKeyDown}
      />
      <Button type="button" onClick={onAdd} size="icon" variant="outline">
        <Plus className="h-4 w-4" />
        <span className="sr-only">Add amenity</span>
      </Button>
    </div>
  );
}

export function PropertyFormFeatures({ 
  property, 
  errors,
  onAmenitiesChange 
}: PropertyFormFeaturesProps) {
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState('');

  const addAmenity = () => {
    const trimmedAmenity = newAmenity.trim();
    if (trimmedAmenity && !amenities.includes(trimmedAmenity)) {
      const updatedAmenities = [...amenities, trimmedAmenity];
      setAmenities(updatedAmenities);
      setNewAmenity('');
      onAmenitiesChange?.(updatedAmenities);
    }
  };

  const removeAmenity = (index: number) => {
    const updatedAmenities = amenities.filter((_, i) => i !== index);
    setAmenities(updatedAmenities);
    onAmenitiesChange?.(updatedAmenities);
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={property?.description || ''}
          placeholder="Describe the property (optional)"
          rows={4}
          className={errors?.description ? 'border-destructive' : ''}
        />
        {errors?.description && (
          <p className="text-sm text-destructive">{errors.description[0]}</p>
        )}
      </div>

      {/* Amenities */}
      <div className="space-y-4">
        <Label>Amenities</Label>
        
        <AmenityInput
          value={newAmenity}
          onChange={setNewAmenity}
          onAdd={addAmenity}
        />

        {amenities.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {amenities.length} amenities added
            </p>
            <div className="flex flex-wrap gap-2">
              {amenities.map((amenity, index) => (
                <AmenityTag
                  key={index}
                  amenity={amenity}
                  onRemove={() => removeAmenity(index)}
                />
              ))}
            </div>
          </div>
        )}

        {amenities.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No amenities added yet. Add features like "Pool", "Gym", "Parking" etc.
          </p>
        )}
      </div>
    </div>
  );
}