import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

// Import our new tRPC hooks
import { 
  useProperties, 
  useCreateProperty, 
  usePropertyStats 
} from '@/hooks/trpc/useProperties'
import { 
  useTenants, 
  useInviteTenant, 
  useTenantStats 
} from '@/hooks/trpc/useTenants'
import { 
  usePayments, 
  usePaymentStats 
} from '@/hooks/trpc/usePayments'
import { useMe } from '@/hooks/trpc/useAuth'

export function TrpcExample() {
  const { toast } = useToast()
  
  // Auth
  const { data: user, isLoading: userLoading } = useMe()
  
  // Properties
  const { data: properties, isLoading: propertiesLoading } = useProperties()
  const { data: propertyStats } = usePropertyStats()
  const createProperty = useCreateProperty()
  
  // Tenants
  const { data: tenants, isLoading: tenantsLoading } = useTenants()
  const { data: tenantStats } = useTenantStats()
  const inviteTenant = useInviteTenant()
  
  // Payments
  const { data: payments, isLoading: paymentsLoading } = usePayments()
  const { data: paymentStats } = usePaymentStats()
  
  // Form state
  const [newProperty, setNewProperty] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  })
  
  const [newTenant, setNewTenant] = useState({
    name: '',
    email: '',
    phone: '',
  })
  
  const handleCreateProperty = async () => {
    try {
      await createProperty.mutateAsync(newProperty)
      toast({
        title: 'Success',
        description: 'Property created successfully!',
      })
      setNewProperty({ name: '', address: '', city: '', state: '', zipCode: '' })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create property',
        variant: 'destructive',
      })
    }
  }
  
  const handleInviteTenant = async () => {
    try {
      await inviteTenant.mutateAsync(newTenant)
      toast({
        title: 'Success',
        description: 'Tenant invitation sent!',
      })
      setNewTenant({ name: '', email: '', phone: '' })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive',
      })
    }
  }
  
  if (userLoading) {
    return <div>Loading user...</div>
  }
  
  if (!user) {
    return <div>Please log in to view this example</div>
  }
  
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">tRPC Integration Example</h1>
      
      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current User</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Name:</strong> {user.name || 'Not set'}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
        </CardContent>
      </Card>
      
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {propertyStats?.totalProperties || 0}
            </p>
            <p className="text-sm text-gray-600">
              {propertyStats?.totalUnits || 0} total units
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {tenantStats?.totalTenants || 0}
            </p>
            <p className="text-sm text-gray-600">
              {tenantStats?.pendingInvitations || 0} pending invitations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${paymentStats?.totalAmount?.toLocaleString() || 0}
            </p>
            <p className="text-sm text-gray-600">
              {paymentStats?.collectionRate?.toFixed(1) || 0}% collection rate
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Create Property Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Property</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="property-name">Property Name</Label>
              <Input
                id="property-name"
                value={newProperty.name}
                onChange={(e) => setNewProperty(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter property name"
              />
            </div>
            <div>
              <Label htmlFor="property-address">Address</Label>
              <Input
                id="property-address"
                value={newProperty.address}
                onChange={(e) => setNewProperty(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>
            <div>
              <Label htmlFor="property-city">City</Label>
              <Input
                id="property-city"
                value={newProperty.city}
                onChange={(e) => setNewProperty(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Enter city"
              />
            </div>
            <div>
              <Label htmlFor="property-state">State</Label>
              <Input
                id="property-state"
                value={newProperty.state}
                onChange={(e) => setNewProperty(prev => ({ ...prev, state: e.target.value }))}
                placeholder="Enter state"
              />
            </div>
          </div>
          <Button 
            onClick={handleCreateProperty}
            disabled={createProperty.isLoading}
          >
            {createProperty.isLoading ? 'Creating...' : 'Create Property'}
          </Button>
        </CardContent>
      </Card>
      
      {/* Invite Tenant Form */}
      <Card>
        <CardHeader>
          <CardTitle>Invite New Tenant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="tenant-name">Name</Label>
              <Input
                id="tenant-name"
                value={newTenant.name}
                onChange={(e) => setNewTenant(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter tenant name"
              />
            </div>
            <div>
              <Label htmlFor="tenant-email">Email</Label>
              <Input
                id="tenant-email"
                type="email"
                value={newTenant.email}
                onChange={(e) => setNewTenant(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email"
              />
            </div>
            <div>
              <Label htmlFor="tenant-phone">Phone (Optional)</Label>
              <Input
                id="tenant-phone"
                value={newTenant.phone}
                onChange={(e) => setNewTenant(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
          </div>
          <Button 
            onClick={handleInviteTenant}
            disabled={inviteTenant.isLoading}
          >
            {inviteTenant.isLoading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </CardContent>
      </Card>
      
      {/* Data Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Properties ({properties?.total || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {propertiesLoading ? (
              <p>Loading properties...</p>
            ) : properties?.properties?.length ? (
              <ul className="space-y-2">
                {properties.properties.map((property) => (
                  <li key={property.id} className="p-2 border rounded">
                    <p className="font-medium">{property.name}</p>
                    <p className="text-sm text-gray-600">{property.address}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No properties found</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Tenants ({tenants?.total || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {tenantsLoading ? (
              <p>Loading tenants...</p>
            ) : tenants?.tenants?.length ? (
              <ul className="space-y-2">
                {tenants.tenants.map((tenant) => (
                  <li key={tenant.id} className="p-2 border rounded">
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-gray-600">{tenant.email}</p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      tenant.invitationStatus === 'ACCEPTED' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {tenant.invitationStatus}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No tenants found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}