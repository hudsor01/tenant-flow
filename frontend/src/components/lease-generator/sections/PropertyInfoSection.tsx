import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LeaseGeneratorFormData } from '@/hooks/useLeaseGeneratorForm';

interface PropertyInfoSectionProps {
  form: UseFormReturn<LeaseGeneratorFormData>;
  usStates: string[];
}

/**
 * Property information section for lease generator
 * Handles property address, location, and unit details
 */
export function PropertyInfoSection({ 
  form, 
  usStates 
}: PropertyInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Property Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="propertyAddress">Property Address *</Label>
            <Input
              id="propertyAddress"
              placeholder="123 Main Street"
              {...form.register('propertyAddress')}
            />
            {form.formState.errors.propertyAddress && (
              <p className="text-sm text-destructive">
                {form.formState.errors.propertyAddress.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              placeholder="Springfield"
              {...form.register('city')}
            />
            {form.formState.errors.city && (
              <p className="text-sm text-destructive">
                {form.formState.errors.city.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="state">State *</Label>
            <Select onValueChange={(value) => form.setValue('state', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {usStates.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.state && (
              <p className="text-sm text-destructive">
                {form.formState.errors.state.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="zipCode">ZIP Code *</Label>
            <Input
              id="zipCode"
              placeholder="62701"
              {...form.register('zipCode')}
            />
            {form.formState.errors.zipCode && (
              <p className="text-sm text-destructive">
                {form.formState.errors.zipCode.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="unitNumber">Unit Number (Optional)</Label>
            <Input
              id="unitNumber"
              placeholder="Apt 4B"
              {...form.register('unitNumber')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}