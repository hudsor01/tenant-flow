import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Users,
  Edit,
  Calendar,
  Phone,
  Mail,
  Receipt,
  FileText
} from 'lucide-react';
import type { PropertyWithUnitsAndLeases } from '@/types/relationships';
import type { Unit } from '@/types/entities';
import PaymentsList from '@/components/payments/PaymentsList';
import PropertyFileUpload from '@/components/properties/PropertyFileUpload';
import { getUnitLeaseInfo } from '@/hooks/usePropertyDetailData';

// Import missing components - these will need to be created or may already exist
// import PropertyImageGallery from '@/components/properties/PropertyImageGallery';
// import PropertyImageUpload from '@/components/properties/PropertyImageUpload';

interface PropertyTabsSectionProps {
  property: PropertyWithUnitsAndLeases;
  totalUnits: number;
  fadeInUp: {
    initial: { opacity: number; y: number };
    animate: { opacity: number; y: number };
  };
  onAddUnit: () => void;
  onEditUnit: (unit: Unit) => void;
  onCreateLease: (unitId: string) => void;
  onInviteTenant: () => void;
}

/**
 * Property detail tabs section with all tab content
 * Handles units, tenants, payments, images, and property details tabs
 */
export default function PropertyTabsSection({
  property,
  totalUnits,
  fadeInUp,
  onAddUnit,
  onEditUnit,
  onCreateLease,
  onInviteTenant,
}: PropertyTabsSectionProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      {...fadeInUp}
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
            <Button onClick={onAddUnit} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {property.units?.map((unit) => {
              const { tenant } = getUnitLeaseInfo(unit);

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
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.email}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => onEditUnit(unit)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {unit.status === 'VACANT' ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => onCreateLease(unit.id)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Create Lease
                        </Button>
                      ) : tenant && (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/tenants/${tenant.id}`)}
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
            <Button onClick={onInviteTenant} size="sm">
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
              <Button onClick={onInviteTenant} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Invite Your First Tenant
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <PaymentsList
            propertyId={property.id}
            showAddButton={true}
            title="Property Payments"
            description="All payments received for units in this property"
          />
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images" className="space-y-4">
          <div className="space-y-6">
            {/* Property Image Gallery would go here */}
            <Card>
              <CardHeader>
                <CardTitle>Property Images</CardTitle>
                <CardDescription>Upload and manage property photos</CardDescription>
              </CardHeader>
              <CardContent>
                <PropertyFileUpload propertyId={property.id} />
              </CardContent>
            </Card>
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
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">
                    {property.address}<br />
                    {property.city}, {property.state} {property.zipCode}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(property.createdAt), 'MMM d, yyyy')}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Units</p>
                  <p className="font-medium">{totalUnits}</p>
                </div>
                {property.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{property.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}