/**
 * Enhanced UI Components Example
 * 
 * This file demonstrates the new CVA-based component system with:
 * - Systematic component variants
 * - Property management specific components
 * - Consistent design patterns
 * - Type-safe styling
 */

import React, { useState } from 'react'
import { 
  Home, 
  Users, 
  Settings, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Clock,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Download
} from 'lucide-react'

import { Button } from '@/components/ui/enhanced-button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/enhanced-card'
import { Badge, StatusBadge, PriorityBadge, MetricBadge } from '@/components/ui/enhanced-badge'
import { cn } from '@/lib/utils'

// Mock data for demonstration
const mockProperties = [
  { id: '1', name: 'Sunset Apartments', units: 12, occupied: 10, rent: 15600, status: 'active' },
  { id: '2', name: 'Oak Street Duplex', units: 2, occupied: 2, rent: 3200, status: 'active' },
  { id: '3', name: 'Downtown Loft', units: 1, occupied: 0, rent: 0, status: 'maintenance' },
]

const mockMaintenanceRequests = [
  { id: '1', title: 'Leaking Faucet', priority: 'medium', status: 'pending', property: 'Sunset Apartments' },
  { id: '2', title: 'Broken AC Unit', priority: 'urgent', status: 'in_progress', property: 'Oak Street Duplex' },
  { id: '3', title: 'Gas Leak', priority: 'emergency', status: 'pending', property: 'Downtown Loft' },
]

const mockTenants = [
  { id: '1', name: 'John Smith', status: 'active', rentPaid: true, lease: 'expires_soon' },
  { id: '2', name: 'Sarah Johnson', status: 'active', rentPaid: false, lease: 'active' },
  { id: '3', name: 'Mike Brown', status: 'pending', rentPaid: false, lease: 'draft' },
]

export function EnhancedUIExample() {
  const [selectedTab, setSelectedTab] = useState('overview')
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const handleAsyncAction = async (actionId: string, delay = 2000) => {
    setLoadingStates(prev => ({ ...prev, [actionId]: true }))
    await new Promise(resolve => setTimeout(resolve, delay))
    setLoadingStates(prev => ({ ...prev, [actionId]: false }))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Property Management Dashboard</h1>
            <p className="text-gray-600 mt-1">Enhanced UI Components Demonstration</p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              leftIcon={<Download className="h-4 w-4" />}
              loading={loadingStates.export}
              loadingText="Exporting..."
              onClick={() => handleAsyncAction('export')}
            >
              Export Data
            </Button>
            <Button 
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => alert('Add new property')}
            >
              Add Property
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: Home },
            { id: 'properties', label: 'Properties', icon: Home },
            { id: 'tenants', label: 'Tenants', icon: Users },
            { id: 'maintenance', label: 'Maintenance', icon: Settings },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <Button
                key={tab.id}
                variant={selectedTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                leftIcon={<Icon className="h-4 w-4" />}
                onClick={() => setSelectedTab(tab.id)}
                className="transition-all"
              >
                {tab.label}
              </Button>
            )
          })}
        </div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card variant="elevated" interactive>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    Total Properties
                    <Home className="h-5 w-5 text-blue-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">3</div>
                  <MetricBadge
                    value="12%"
                    label="vs last month"
                    trend="up"
                    variant="success"
                    size="sm"
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card variant="elevated" interactive>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    Occupancy Rate
                    <Users className="h-5 w-5 text-green-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">80%</div>
                  <MetricBadge
                    value="5%"
                    label="vs last month"
                    trend="down"
                    variant="warning"
                    size="sm"
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card variant="elevated" interactive>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    Monthly Revenue
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600">$18,800</div>
                  <MetricBadge
                    value="8%"
                    label="vs last month"
                    trend="up"
                    variant="success"
                    size="sm"
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card variant="danger" interactive>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    Urgent Issues
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">2</div>
                  <PriorityBadge
                    priority="emergency"
                    size="sm"
                    className="mt-2"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card variant="default">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates across your properties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { action: 'New tenant application', property: 'Sunset Apartments', time: '2 hours ago', type: 'info' },
                    { action: 'Maintenance request completed', property: 'Oak Street Duplex', time: '4 hours ago', type: 'success' },
                    { action: 'Rent payment overdue', property: 'Downtown Loft', time: '1 day ago', type: 'warning' },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div>
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-gray-600">{activity.property}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={activity.type} size="sm" />
                        <span className="text-sm text-gray-500">{activity.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Properties Tab */}
        {selectedTab === 'properties' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Properties</h2>
              <Button leftIcon={<Plus className="h-4 w-4" />} size="sm">
                Add Property
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockProperties.map(property => (
                <Card key={property.id} variant="elevated" interactive>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {property.name}
                      <StatusBadge status={property.status} showIcon />
                    </CardTitle>
                    <CardDescription>
                      {property.units} units • {property.occupied} occupied
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Occupancy Rate</span>
                        <Badge variant="secondary">
                          {Math.round((property.occupied / property.units) * 100)}%
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Monthly Revenue</span>
                        <Badge variant="success" className="font-mono">
                          ${property.rent.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter spaced>
                    <Button variant="ghost" size="sm" leftIcon={<Edit className="h-4 w-4" />}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />}>
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tenants Tab */}
        {selectedTab === 'tenants' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Tenants</h2>
              <Button leftIcon={<Plus className="h-4 w-4" />} size="sm">
                Invite Tenant
              </Button>
            </div>

            <Card>
              <CardContent noPadding>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tenant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rent Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lease
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {mockTenants.map(tenant => (
                        <tr key={tenant.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{tenant.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={tenant.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge 
                              status={tenant.rentPaid ? 'completed' : 'pending'} 
                              showIcon
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={tenant.lease} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="xs">
                                View
                              </Button>
                              <Button variant="ghost" size="xs">
                                Contact
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Maintenance Tab */}
        {selectedTab === 'maintenance' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Maintenance Requests</h2>
              <Button leftIcon={<Plus className="h-4 w-4" />} size="sm">
                New Request
              </Button>
            </div>

            <div className="space-y-4">
              {mockMaintenanceRequests.map(request => (
                <Card 
                  key={request.id} 
                  variant={request.priority === 'emergency' ? 'danger' : 'default'}
                  interactive
                >
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{request.title}</h3>
                          <PriorityBadge 
                            priority={request.priority as any} 
                            animated={request.priority === 'emergency'}
                          />
                        </div>
                        
                        <p className="text-gray-600 mb-3">{request.property}</p>
                        
                        <div className="flex items-center gap-3">
                          <StatusBadge status={request.status} showIcon />
                          <Badge variant="outline" size="sm">
                            <Clock className="h-3 w-3 mr-1" />
                            2 hours ago
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          loading={loadingStates[`assign-${request.id}`]}
                          loadingText="Assigning..."
                          onClick={() => handleAsyncAction(`assign-${request.id}`, 1500)}
                        >
                          Assign
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          loading={loadingStates[`complete-${request.id}`]}
                          loadingText="Completing..."
                          onClick={() => handleAsyncAction(`complete-${request.id}`, 2000)}
                        >
                          Complete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Button Showcase */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Component Showcase</CardTitle>
            <CardDescription>
              Various button variants and states
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              
              {/* Button Variants */}
              <div>
                <h4 className="font-medium mb-3">Button Variants</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="warning">Warning</Button>
                  <Button variant="info">Info</Button>
                </div>
              </div>

              {/* Button Sizes */}
              <div>
                <h4 className="font-medium mb-3">Button Sizes</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="xs">Extra Small</Button>
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="xl">Extra Large</Button>
                </div>
              </div>

              {/* Button States */}
              <div>
                <h4 className="font-medium mb-3">Button States</h4>
                <div className="flex flex-wrap gap-2">
                  <Button leftIcon={<Home className="h-4 w-4" />}>With Left Icon</Button>
                  <Button rightIcon={<TrendingUp className="h-4 w-4" />}>With Right Icon</Button>
                  <Button loading loadingText="Processing...">Loading State</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>

              {/* Badge Variants */}
              <div>
                <h4 className="font-medium mb-3">Badge Variants</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="gradient">Gradient</Badge>
                </div>
              </div>

              {/* Status Badges */}
              <div>
                <h4 className="font-medium mb-3">Status Badges</h4>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status="active" showIcon />
                  <StatusBadge status="vacant" showIcon />
                  <StatusBadge status="maintenance" showIcon />
                  <StatusBadge status="expired" showIcon />
                  <PriorityBadge priority="low" />
                  <PriorityBadge priority="medium" />
                  <PriorityBadge priority="high" />
                  <PriorityBadge priority="urgent" />
                  <PriorityBadge priority="emergency" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}