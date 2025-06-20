import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Home, User, Building } from 'lucide-react';
import { format } from 'date-fns';
import type { Lease } from '@/types/entities';
import { useCreateLease, useUpdateLease } from '@/hooks/useLeases';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
// import { useAuthStore } from '@/store/authStore'; // Not currently used
import { LeaseStatus } from '../../types/supabase-generated';

// Improved schema with proper property-first logic
const leaseSchema = z.object({
  propertyId: z.string().min(1, 'Please select a property'),
  unitId: z.string().optional(), // Optional - for properties without units or whole-property leases
  tenantId: z.string().min(1, 'Please select at least one tenant'), // TODO: Support multiple tenants
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  rentAmount: z.number().min(0, 'Rent amount must be positive').max(100000, 'Rent amount too high'),
  securityDeposit: z.number().min(0, 'Security deposit must be positive').max(100000, 'Security deposit too high'),
  status: z.custom<LeaseStatus>(),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type LeaseFormData = z.infer<typeof leaseSchema>;

interface LeaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lease?: Lease;
  mode?: 'create' | 'edit';
  // Pre-selected values (optional)
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
}

export default function LeaseFormModal({
  isOpen,
  onClose,
  onSuccess,
  lease,
  mode = 'create',
  propertyId: defaultPropertyId,
  unitId: defaultUnitId,
  tenantId: defaultTenantId
}: LeaseFormModalProps) {
  // const { user } = useAuthStore(); // Not currently used
  const createLease = useCreateLease();
  const updateLease = useUpdateLease();
  
  // Get user's properties
  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  
  // Get units for selected property
  const { data: propertyUnits = [] } = useQuery({
    queryKey: ['property-units', selectedPropertyId],
    queryFn: async () => {
      if (!selectedPropertyId) return []
      
      const { data, error } = await supabase
        .from('Unit')
        .select('id, unitNumber, bedrooms, bathrooms, squareFeet, rent, status')
        .eq('propertyId', selectedPropertyId)
        .order('unitNumber', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    enabled: !!selectedPropertyId,
  });

  const form = useForm<LeaseFormData>({
    resolver: zodResolver(leaseSchema),
    defaultValues: {
      propertyId: defaultPropertyId || '',
      unitId: defaultUnitId || lease?.unitId || '',
      tenantId: defaultTenantId || lease?.tenantId || '',
      startDate: lease?.startDate ? format(new Date(lease.startDate), 'yyyy-MM-dd') : '',
      endDate: lease?.endDate ? format(new Date(lease.endDate), 'yyyy-MM-dd') : '',
      rentAmount: lease?.rentAmount || 0,
      securityDeposit: lease?.securityDeposit || 0,
      status: lease?.status || 'DRAFT',
    },
  });

  // Watch property selection to update units
  const watchedPropertyId = form.watch('propertyId');
  useEffect(() => {
    if (watchedPropertyId !== selectedPropertyId) {
      setSelectedPropertyId(watchedPropertyId);
      // Clear unit selection when property changes
      form.setValue('unitId', '');
    }
  }, [watchedPropertyId, selectedPropertyId, form]);

  // Auto-populate rent from selected unit
  const selectedUnitId = form.watch('unitId');
  useEffect(() => {
    if (selectedUnitId && mode === 'create') {
      const unit = propertyUnits.find(u => u.id === selectedUnitId);
      if (unit) {
        form.setValue('rentAmount', unit.rent);
        form.setValue('securityDeposit', unit.rent * 2); // Default: 2x rent
      }
    }
  }, [selectedUnitId, propertyUnits, form, mode]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const hasUnits = propertyUnits.length > 0;
  const availableUnits = propertyUnits.filter(unit => 
    unit.status === 'VACANT' || (mode === 'edit' && unit.id === lease?.unitId)
  );

  const onSubmit = async (data: LeaseFormData) => {
    try {
      // Convert form data to API format
      const leaseData = {
        unitId: data.unitId || null, // Handle properties without units
        tenantId: data.tenantId,
        startDate: data.startDate,
        endDate: data.endDate,
        rentAmount: data.rentAmount,
        securityDeposit: data.securityDeposit,
        status: mode === 'create' ? 'ACTIVE' : data.status,
      };

      if (mode === 'create') {
        await createLease.mutateAsync(leaseData);
        toast.success('Lease created successfully');
      } else if (lease) {
        await updateLease.mutateAsync({
          id: lease.id,
          data: leaseData,
        });
        toast.success('Lease updated successfully');
      }
      
      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving lease:', error);
      toast.error(mode === 'create' ? 'Failed to create lease' : 'Failed to update lease');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Lease' : 'Edit Lease'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Select a property, assign tenants, and set lease terms.'
              : 'Update the lease agreement details and status.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* STEP 1: Property Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">1. Select Property</h3>
              </div>
              
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-16">
                          <SelectValue placeholder="Choose a property for this lease" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id} className="p-3">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                                <Building className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{property.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {property.address}, {property.city}, {property.state}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {property.propertyType.replace('_', ' ')}
                                </p>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* STEP 2: Unit Selection (if property has units) */}
            {selectedProperty && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">2. Select Unit (Optional)</h3>
                </div>
                
                {!hasUnits ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800">
                      <strong>{selectedProperty.name}</strong> doesn't have units defined. 
                      This lease will apply to the entire property.
                    </p>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="unitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit (Optional - leave blank for whole property lease)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a specific unit or leave blank for whole property" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">
                              <div className="flex items-center space-x-2">
                                <Building className="h-4 w-4" />
                                <span>Whole Property Lease</span>
                              </div>
                            </SelectItem>
                            {availableUnits.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id} className="p-3">
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                                      <Home className="h-4 w-4 text-gray-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium">Unit {unit.unitNumber}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {unit.bedrooms}BR • {unit.bathrooms}BA
                                        {unit.squareFeet && ` • ${unit.squareFeet} sq ft`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-green-600">${unit.rent}</p>
                                    <p className="text-xs text-muted-foreground">per month</p>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {availableUnits.length === 0 && hasUnits ? 
                            'No vacant units available' : 
                            'Choose a specific unit or leave blank for a whole-property lease'
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* STEP 3: Tenant Selection */}
            {selectedProperty && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">3. Select Tenant(s)</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Tenant *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select the primary tenant for this lease" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenants.filter(t => t.invitationStatus === 'ACCEPTED').map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id} className="p-3">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                                  <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{tenant.name}</p>
                                  <p className="text-xs text-muted-foreground">{tenant.email}</p>
                                  {tenant.phone && (
                                    <p className="text-xs text-muted-foreground">{tenant.phone}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="ml-auto">
                                  {tenant.invitationStatus}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only accepted tenants are shown. 
                        {/* TODO: Add support for multiple tenants per lease */}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* STEP 4: Lease Terms */}
            {selectedProperty && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">4. Lease Terms</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lease Start Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* End Date */}
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lease End Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Rent Amount */}
                  <FormField
                    control={form.control}
                    name="rentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Rent *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              className="pl-8"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Monthly rent amount agreed upon in the lease
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Security Deposit */}
                  <FormField
                    control={form.control}
                    name="securityDeposit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Deposit *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              className="pl-8"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Security deposit amount (typically 1-2x monthly rent)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Status (edit mode only) */}
                  {mode === 'edit' && (
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Lease Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select lease status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="DRAFT">Draft</SelectItem>
                              <SelectItem value="ACTIVE">Active</SelectItem>
                              <SelectItem value="EXPIRED">Expired</SelectItem>
                              <SelectItem value="TERMINATED">Terminated</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createLease.isPending || updateLease.isPending}
              >
                {createLease.isPending || updateLease.isPending
                  ? 'Saving...'
                  : mode === 'create' ? 'Create Lease' : 'Update Lease'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}