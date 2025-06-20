import React, { useState } from 'react'
import { useTenantData, useCreateMaintenanceRequest } from '../../hooks/useTenantData'
import { CreditCard, Wrench, User, AlertCircle, CheckCircle, Clock, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export default function TenantDashboard() {
  // const { user } = useAuth()
  const { data: tenantData, isLoading, error } = useTenantData()
  const createMaintenanceRequest = useCreateMaintenanceRequest()
  
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false)
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  })
  const [isSubmittingMaintenance, setIsSubmittingMaintenance] = useState(false)

  const handleMaintenanceSubmit = async () => {
    if (!tenantData || !maintenanceForm.title.trim() || !maintenanceForm.description.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setIsSubmittingMaintenance(true)
      await createMaintenanceRequest({
        title: maintenanceForm.title,
        description: maintenanceForm.description,
        priority: maintenanceForm.priority,
        unitId: tenantData.property.unit.id
      })
      
      toast.success('Maintenance request submitted successfully!')
      setIsMaintenanceDialogOpen(false)
      setMaintenanceForm({ title: '', description: '', priority: 'MEDIUM' })
      
      // Refresh data
      window.location.reload()
    } catch (err: unknown) {
      const error = err as Error
      console.error('Failed to submit maintenance request:', error)
      toast.error('Failed to submit request: ' + (error.message || 'Unknown error'))
    } finally {
      setIsSubmittingMaintenance(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'URGENT': return 'text-red-600'
      case 'HIGH': return 'text-orange-600'
      case 'MEDIUM': return 'text-yellow-600'
      case 'LOW': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !tenantData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 text-center mb-4">
              {error ? 'Failed to load tenant data.' : 'No active lease found for your account.'}
            </p>
            <p className="text-sm text-gray-500 text-center">
              Please contact your property manager if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {tenantData.tenant.name}</h1>
        <p className="text-gray-600">Manage your rental, payments, and requests</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => window.location.href = '/tenant/payments'}
                >
                  <CreditCard className="h-6 w-6 mb-2" />
                  <span className="text-sm">Pay Rent</span>
                </Button>
                
                <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                      <Wrench className="h-6 w-6 mb-2" />
                      <span className="text-sm">Maintenance</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Submit Maintenance Request</DialogTitle>
                      <DialogDescription>
                        Describe the issue you're experiencing in your unit.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Issue Title *</Label>
                        <Input
                          id="title"
                          placeholder="e.g., Kitchen faucet leaking"
                          value={maintenanceForm.title}
                          onChange={(e) => setMaintenanceForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                          id="description"
                          placeholder="Please provide detailed information about the issue..."
                          value={maintenanceForm.description}
                          onChange={(e) => setMaintenanceForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={maintenanceForm.priority}
                          onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') => setMaintenanceForm(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="URGENT">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsMaintenanceDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleMaintenanceSubmit}
                          disabled={isSubmittingMaintenance || !maintenanceForm.title.trim() || !maintenanceForm.description.trim()}
                        >
                          {isSubmittingMaintenance ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Submitting...
                            </>
                          ) : (
                            'Submit Request'
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Payments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Upcoming Payments
              </CardTitle>
              <CardDescription>
                Your next payment due dates and amounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tenantData.upcomingPayments?.length > 0 ? (
                  tenantData.upcomingPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{payment.type}</p>
                        <p className="text-sm text-gray-600">Due: {new Date(payment.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">${payment.amount.toLocaleString()}</p>
                        <Badge variant={payment.status === 'pending' ? 'destructive' : 'default'}>
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>All payments are up to date!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Maintenance Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="h-5 w-5 mr-2" />
                Maintenance Requests
              </CardTitle>
              <CardDescription>
                Track your maintenance requests and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tenantData.maintenanceRequests?.length > 0 ? (
                  tenantData.maintenanceRequests.map((request) => (
                    <div key={request.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{request.title}</p>
                        {request.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{request.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
                          {request.updatedAt !== request.createdAt && (
                            <span>Updated: {new Date(request.updatedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-2 ml-4">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status === 'COMPLETED' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {request.status === 'IN_PROGRESS' && <Clock className="h-3 w-3 mr-1" />}
                          {request.status === 'PENDING' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {request.status.replace('_', ' ')}
                        </div>
                        <p className={`text-xs font-medium ${getPriorityColor(request.priority)}`}>
                          {request.priority} priority
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No maintenance requests</p>
                    <p className="text-sm">Submit a request if you need assistance</p>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsMaintenanceDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Submit New Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}