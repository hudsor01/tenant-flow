import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  MapPin,
  DollarSign,
  Home,
  Users,
  Edit,
  Trash2,
  Calendar,
  Phone,
  Mail,
  FileText,
  UserCheck,
  UserX,
  Plus,
  MoreVertical,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Unit } from '@/types/entities';
import type { PropertyWithUnitsAndLeases } from '@/types/relationships';

// Note: Using 'any' types for complex nested Supabase query results with spread operations
import { useDeleteProperty } from '@/hooks/useProperties';
import { toast } from 'sonner';
import PropertyFormModal from '@/components/properties/PropertyFormModal';
import UnitFormModal from '@/components/units/UnitFormModal';
import InviteTenantModal from '@/components/tenants/InviteTenantModal';
import LeaseFormModal from '@/components/leases/LeaseFormModal';
import PaymentsList from '@/components/payments/PaymentsList';
import PropertyFileUpload from '@/components/properties/PropertyFileUpload';
import PropertyImageGallery from '@/components/properties/PropertyImageGallery';
import PropertyImageUpload from '@/components/properties/PropertyImageUpload';

export default function PropertyDetail() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const deleteProperty = useDeleteProperty();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | undefined>(undefined);
  const [selectedUnitForLease, setSelectedUnitForLease] = useState<string | undefined>(undefined);

  // Fetch property with all related data
  const { data: property, isLoading, error } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Property')
        .select(`
          *,
          units:Unit (
            *,
            leases:Lease (
              *,
              tenant:Tenant (*)
            )
          )
        `)
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      return data as PropertyWithUnitsAndLeases;
    },
    enabled: !!propertyId,
  });

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      try {
        await deleteProperty.mutateAsync(propertyId!);
        toast.success('Property deleted successfully');
        navigate('/properties');
      } catch (error) {
        toast.error('Failed to delete property');
        console.error('Delete property error:', error);
      }
    }
  };

  const handleAddUnit = () => {
    setEditingUnit(undefined);
    setIsUnitModalOpen(true);
  };

  const handleEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setIsUnitModalOpen(true);
  };

  const handleCreateLease = (unitId: string) => {
    setSelectedUnitForLease(unitId);
    setIsLeaseModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 bg-gray-200 rounded" />
          <div className="h-8 bg-gray-200 rounded w-64" />
        </div>
        <div className="h-64 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Property not found</h3>
        <p className="text-muted-foreground mt-2">The property you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/properties')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
      </div>
    );
  }

  // Calculate statistics
  const totalUnits = property.units?.length || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const occupiedUnits = property.units?.filter((unit: any) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unit.status === 'OCCUPIED' && unit.leases?.some((lease: any) => lease.status === 'ACTIVE')
  ).length || 0;
  const vacantUnits = totalUnits - occupiedUnits;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalMonthlyRent = property.units?.reduce((sum: number, unit: any) => {
    if (unit.status === 'OCCUPIED' && unit.leases && unit.leases.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeLeases = unit.leases.filter((lease: any) => lease.status === 'ACTIVE');
      return sum + (activeLeases.length > 0 ? activeLeases[0].rentAmount : 0);
    }
    return sum;
  }, 0) || 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const potentialRent = property.units?.reduce((sum: number, unit: any) => sum + unit.rent, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/properties')}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{property.name}</h1>
            <p className="text-muted-foreground flex items-center mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              {property.address}, {property.city}, {property.state} {property.zipCode}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Property
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Property
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Property Image */}
      {property.imageUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative h-64 md:h-96 rounded-lg overflow-hidden"
        >
          <img
            src={property.imageUrl}
            alt={property.name}
            className="w-full h-full object-cover"
          />
        </motion.div>
      )}

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mr-4">
              <Home className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Units</p>
              <p className="text-2xl font-bold">{totalUnits}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Occupied</p>
              <p className="text-2xl font-bold">{occupiedUnits}</p>
              <p className="text-xs text-green-600">{occupancyRate}% occupancy</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mr-4">
              <UserX className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vacant</p>
              <p className="text-2xl font-bold">{vacantUnits}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mr-4">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              <p className="text-2xl font-bold">${totalMonthlyRent.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">of ${potentialRent.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs defaultValue="units" className="space-y-4">
          <TabsList>
            <TabsTrigger value="units">Units</TabsTrigger>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="details">Property Details</TabsTrigger>
          </TabsList>

          {/* Units Tab */}
          <TabsContent value="units" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Units ({totalUnits})</h3>
              <Button onClick={handleAddUnit} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Unit
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {property.units?.map((unit) => {
                const activeLease = unit.leases?.find(lease => lease.status === 'ACTIVE');
                const tenant = activeLease?.tenant;

                return (
                  <Card key={unit.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Unit {unit.unitNumber}</CardTitle>
                        <Badge variant={unit.status === 'OCCUPIED' ? 'default' : 'secondary'}>
                          {unit.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {unit.bedrooms} bed, {unit.bathrooms} bath
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Square Feet</span>
                        <span className="font-medium">{unit.squareFeet}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Rent</span>
                        <span className="font-medium text-green-600">${unit.rent}/mo</span>
                      </div>

                      {tenant && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Current Tenant</p>
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{tenant.name}</span>
                            </div>
                            {activeLease && (
                              <p className="text-xs text-muted-foreground">
                                Lease ends: {format(new Date(activeLease.endDate), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEditUnit(unit)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {unit.status === 'VACANT' ? (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleCreateLease(unit.id)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Create Lease
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsInviteModalOpen(true)}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          </>
                        ) : tenant && activeLease && (
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              // Navigate to tenant detail page to record payment
                              navigate(`/tenants/${tenant.id}`);
                            }}
                          >
                            <Receipt className="h-4 w-4 mr-1" />
                            Record Payment
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Tenants Tab */}
          <TabsContent value="tenants" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Current Tenants</h3>
              <Button onClick={() => setIsInviteModalOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Invite Tenant
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {property.units?.flatMap(unit =>
                unit.leases?.filter(lease => lease.status === 'ACTIVE').map(lease => ({
                  ...lease.tenant,
                  unit,
                  lease
                })) || []
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ).map((tenant: any) => (
                <Card key={tenant.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold">{tenant.name}</h4>
                          <p className="text-sm text-muted-foreground">Unit {tenant.unit.unitNumber}</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center text-sm">
                            <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{tenant.email}</span>
                          </div>
                          {tenant.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>{tenant.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>Lease: {format(new Date(tenant.lease.startDate), 'MMM yyyy')} - {format(new Date(tenant.lease.endDate), 'MMM yyyy')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/tenants/${tenant.id}`)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/tenants/${tenant.id}?tab=payments`)}
                        >
                          <Receipt className="h-4 w-4 mr-1" />
                          Payment
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {property.units?.every(unit => !unit.leases?.some(lease => lease.status === 'ACTIVE')) && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No active tenants</p>
                <Button onClick={() => setIsInviteModalOpen(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Your First Tenant
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <PaymentsList
              propertyId={propertyId}
              showAddButton={true}
              title="Property Payments"
              description="All payments received for units in this property"
            />
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-4">
            <div className="space-y-6">
              <PropertyImageGallery 
                propertyId={property.id}
                property={property}
                onUploadClick={() => {
                  // Scroll to upload section
                  document.getElementById('image-upload')?.scrollIntoView({ behavior: 'smooth' })
                }}
              />
              
              <div id="image-upload">
                <PropertyImageUpload 
                  propertyId={property.id}
                  onUploadComplete={() => {
                    toast.success('Images uploaded successfully!')
                  }}
                />
              </div>
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Property Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Property Type</p>
                    <p className="font-medium">
                      {(property as { propertyType?: string }).propertyType ?
                        (property as { propertyType: string }).propertyType.replace('_', ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase()) :
                        'Single Family'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Units</p>
                    <p className="font-medium">{property.units?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Square Footage</p>
                    <p className="font-medium">{property.units?.reduce((sum, unit) => sum + (unit.squareFeet || 0), 0).toLocaleString() || 0} sq ft</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {property.address}<br />
                      {property.city}, {property.state} {property.zipCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Added</p>
                    <p className="font-medium">{format(new Date(property.createdAt), 'MMMM d, yyyy')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {property.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{property.description}</p>
                </CardContent>
              </Card>
            )}

            {/* File Upload Section */}
            <PropertyFileUpload
              propertyId={property.id}
              onUploadComplete={(urls) => {
                toast.success(`Successfully uploaded ${urls.length} file${urls.length > 1 ? 's' : ''}`)
              }}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Modals */}
      <PropertyFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        property={property}
        mode="edit"
      />

      {isUnitModalOpen && (
        <UnitFormModal
          isOpen={isUnitModalOpen}
          onClose={() => {
            setIsUnitModalOpen(false);
            setEditingUnit(undefined);
          }}
          propertyId={property.id}
          unit={editingUnit}
          mode={editingUnit ? 'edit' : 'create'}
        />
      )}

      {isInviteModalOpen && (
        <InviteTenantModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          selectedPropertyId={propertyId}
        />
      )}

      {isLeaseModalOpen && (
        <LeaseFormModal
          isOpen={isLeaseModalOpen}
          onClose={() => {
            setIsLeaseModalOpen(false);
            setSelectedUnitForLease(undefined);
          }}
          propertyId={property.id}
          unitId={selectedUnitForLease}
          mode="create"
        />
      )}
    </div>
  );
}
