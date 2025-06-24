import { motion } from 'framer-motion'
import { useState } from 'react'
import { 
  DollarSign, 
  Users, 
  Home, 
  AlertTriangle,
  UserPlus,
  Plus,
  Settings
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useProperties } from '../hooks/useProperties'
import { useAuthStore } from '../store/authStore'
import PropertyCard from '../components/properties/PropertyCard'
import PropertyFormModal from '../components/properties/PropertyFormModal'
import InviteTenantModal from '../components/tenants/InviteTenantModal'
import { UsageWarningBanner } from '../components/billing/UsageWarningBanner'
import { TrialCountdownBanner } from '../components/billing/TrialCountdownBanner'
import type { Property } from '@/types/entities'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const { data: properties = [], isLoading, error } = useProperties()
  const [showPropertyModal, setShowPropertyModal] = useState(false)
  const [showTenantModal, setShowTenantModal] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | undefined>()

  // Calculate real statistics from actual data
  const totalProperties = properties.length
  const totalUnits = properties.reduce((sum, property) => sum + (property.units?.length || 0), 0)
  const occupiedUnits = properties.reduce((sum, property) => 
    sum + (property.units?.filter(unit => unit.status === 'OCCUPIED').length || 0), 0)
  const totalRevenue = properties.reduce((sum, property) => 
    sum + (property.units?.reduce((unitSum, unit) => {
      if (unit.status === 'OCCUPIED' && unit.leases && unit.leases.length > 0) {
        const activeLeases = unit.leases.filter(lease => lease.status === 'ACTIVE')
        return unitSum + (activeLeases.length > 0 ? activeLeases[0].rentAmount : 0)
      }
      return unitSum
    }, 0) || 0), 0)
  
  const maintenanceTickets = 0 // TODO: Load maintenance requests separately

  // Generate recent activity from real data
  const recentActivity = properties.slice(0, 4).map((property) => ({
    id: property.id,
    type: 'property',
    title: `Property: ${property.name}`,
    time: new Date(property.createdAt).toLocaleDateString(),
    icon: Home,
    color: 'bg-primary/10 text-primary'
  }))

  const handleAddProperty = () => {
    setEditingProperty(undefined)
    setShowPropertyModal(true)
  }

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property)
    setShowPropertyModal(true)
  }

  const handleAddTenant = () => {
    setShowTenantModal(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mb-4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground">Failed to load your properties. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.h1 
            className="text-4xl font-bold text-blue-600 tracking-tight mb-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            Welcome back, {user?.name || user?.email?.split('@')[0] || 'Property Manager'}!
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Here's what's happening with your properties today.
          </motion.p>
        </motion.div>

        {/* Trial Countdown Banner */}
        <TrialCountdownBanner />

        {/* Usage Warning Banner */}
        <UsageWarningBanner />

        {/* Metric Cards with Real Data */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Card className="bg-primary text-primary-foreground border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary-foreground/10 rounded-lg">
                    <DollarSign className="h-8 w-8" />
                  </div>
                  <span className="text-sm font-medium opacity-90">Monthly Revenue</span>
                </div>
                <div className="text-3xl font-bold mb-2">
                  ${totalRevenue.toLocaleString()}
                </div>
                <div className="text-primary-foreground/70 text-sm">
                  → From {occupiedUnits} units
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="bg-card border shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Active Tenants</span>
                </div>
                <div className="text-3xl font-bold mb-2 text-foreground">{occupiedUnits}</div>
                <div className="text-muted-foreground text-sm">
                  → {totalUnits} total tenants
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="bg-card border shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <Home className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Properties</span>
                </div>
                <div className="text-3xl font-bold mb-2 text-foreground">{totalProperties}</div>
                <div className="text-muted-foreground text-sm">
                  → {totalUnits} total units
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="bg-card border shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Open Tickets</span>
                </div>
                <div className="text-3xl font-bold mb-2 text-foreground">{maintenanceTickets}</div>
                <div className="text-muted-foreground text-sm">
                  → 0 urgent
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Properties Section */}
        {totalProperties > 0 ? (
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Your Properties</h2>
              <Button onClick={handleAddProperty}>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onEdit={handleEditProperty}
                  onView={(property) => console.log('View property:', property)}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          // Empty State
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Home className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Properties Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Get started by adding your first property to begin managing your real estate portfolio.
            </p>
            <Button onClick={handleAddProperty} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Property
            </Button>
          </motion.div>
        )}

        {/* Quick Actions Section */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => {
                    const IconComponent = activity.icon
                    return (
                      <motion.div 
                        key={activity.id}
                        className="flex items-center justify-between py-3 border-b last:border-b-0"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                      >
                        <div className="flex items-center">
                          <div className="p-2 rounded-full bg-primary/10 mr-3">
                            <IconComponent className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-sm text-foreground">{activity.title}</div>
                            <div className="text-muted-foreground text-xs">Added {activity.time}</div>
                          </div>
                        </div>
                        <div className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                          {activity.type}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No recent activity</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks at your fingertips</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={handleAddProperty}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Property
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={handleAddTenant}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite New Tenant
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start text-left h-auto py-3"
                  disabled
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Maintenance Request (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Modals */}
      <PropertyFormModal
        isOpen={showPropertyModal}
        onClose={() => setShowPropertyModal(false)}
        property={editingProperty}
        mode={editingProperty ? 'edit' : 'create'}
      />

      <InviteTenantModal
        isOpen={showTenantModal}
        onClose={() => setShowTenantModal(false)}
      />
    </div>
  )
}