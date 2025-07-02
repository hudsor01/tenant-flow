import React, { useState } from 'react'
import { Plus, DollarSign, FileText, User, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useLeases } from '@/hooks/useLeases'
import { useProperties as useProperties } from '@/hooks/useProperties'
import LeaseFormModal from '@/components/leases/LeaseFormModal'
import { format, isAfter, isBefore, addDays } from 'date-fns'
import { motion } from 'framer-motion'

export default function LeaseManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  const { data: properties = [], isLoading: propertiesLoading } = useProperties()
  const { data: leases = [], isLoading: leasesLoading, refetch: refetchLeases } = useLeases()
  // Future: Implement tenant and unit filtering

  const isLoading = propertiesLoading || leasesLoading

  // Filter leases based on search term and selected property
  const filteredLeases = leases.filter(lease => {
    const matchesSearch = searchTerm === '' || 
      lease.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.unit?.property?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.unit?.unitNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesProperty = selectedPropertyId === '' || 
      lease.unit?.property?.id === selectedPropertyId
    
    return matchesSearch && matchesProperty
  })

  // Categorize leases
  const activeLeases = filteredLeases.filter(lease => lease.status === 'ACTIVE')
  const expiringLeases = filteredLeases.filter(lease => {
    const endDate = new Date(lease.endDate)
    const now = new Date()
    const in30Days = addDays(now, 30)
    return lease.status === 'ACTIVE' && isAfter(endDate, now) && isBefore(endDate, in30Days)
  })
  const expiredLeases = filteredLeases.filter(lease => 
    lease.status === 'EXPIRED' || 
    (lease.status === 'ACTIVE' && isBefore(new Date(lease.endDate), new Date()))
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'EXPIRED': return 'bg-red-100 text-red-800'
      case 'TERMINATED': return 'bg-gray-100 text-gray-800'
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="h-3 w-3" />
      case 'EXPIRED': return <AlertCircle className="h-3 w-3" />
      case 'TERMINATED': return <AlertCircle className="h-3 w-3" />
      case 'INACTIVE': return <Clock className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lease information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lease Management</h1>
          <p className="text-gray-600">Manage all your property leases and tenant agreements</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Lease
        </Button>
      </div>

      {/* Enhanced Stats Cards - Reordered: Active → Revenue → Expiring → Expired */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 1. Active Leases */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl mr-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{activeLeases.length}</p>
                    <p className="text-sm font-medium text-gray-600">Active Leases</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Current
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 2. Monthly Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl mr-3">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      ${activeLeases.reduce((sum, lease) => sum + lease.rentAmount, 0).toLocaleString()}
                    </p>
                    <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Total
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 3. Expiring Soon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl mr-3">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{expiringLeases.length}</p>
                    <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    30 Days
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 4. Expired */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-red-100 to-rose-100 rounded-xl mr-3">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{expiredLeases.length}</p>
                    <p className="text-sm font-medium text-gray-600">Expired</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                    Action Needed
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by tenant name, property, or unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="sm:w-64">
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">All Properties</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expiring Leases Alert */}
      {expiringLeases.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                Leases Expiring Soon
              </CardTitle>
              <CardDescription className="text-orange-700">
                {expiringLeases.length} lease{expiringLeases.length !== 1 ? 's' : ''} expiring within 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expiringLeases.slice(0, 3).map((lease) => (
                  <div key={lease.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <p className="font-medium">{lease.tenant?.name}</p>
                      <p className="text-sm text-gray-600">
                        {lease.unit?.property?.name} - Unit {lease.unit?.unitNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-orange-800">
                        Expires {format(new Date(lease.endDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Leases List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Leases ({filteredLeases.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLeases.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leases found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedPropertyId 
                  ? 'Try adjusting your search criteria.' 
                  : 'Get started by creating your first lease.'}
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Lease
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLeases.map((lease) => (
                <motion.div
                  key={lease.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{lease.tenant?.name}</h3>
                          <p className="text-sm text-gray-600">{lease.tenant?.email}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-11">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Property & Unit</p>
                          <p className="text-sm font-medium">
                            {lease.unit?.property?.name} - Unit {lease.unit?.unitNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Lease Period</p>
                          <p className="text-sm">
                            {format(new Date(lease.startDate), 'MMM dd, yyyy')} - {format(new Date(lease.endDate), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Monthly Rent</p>
                          <p className="text-sm font-medium">${lease.rentAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={getStatusColor(lease.status)}
                      >
                        {getStatusIcon(lease.status)}
                        <span className="ml-1">{lease.status}</span>
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Lease Modal */}
      <LeaseFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false)
          refetchLeases()
        }}
      />
    </div>
  )
}