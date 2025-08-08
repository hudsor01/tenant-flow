/**
 * Lease Form Fields Component
 * 
 * Server component for rendering lease form fields.
 * Contains all form inputs with proper validation and styling.
 */

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, AlertCircle } from 'lucide-react'
import type { LeaseFormData } from './lease-form-client'

// ============================================================================
// INTERFACES
// ============================================================================

interface LeaseFormFieldsProps {
  formData: LeaseFormData
  errors: Record<string, string>
  availableUnits: {
    value: string
    label: string
    propertyName: string
    unitNumber: string
    rent: number
  }[]
  availableTenants: {
    value: string
    label: string
  }[]
  onChange: (field: string, value: string | number) => void
}

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

// ============================================================================
// FORM FIELD WRAPPER COMPONENT
// ============================================================================

function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label className={required ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
        {label}
      </Label>
      {children}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN FIELDS COMPONENT
// ============================================================================

export function LeaseFormFields({
  formData,
  errors,
  availableUnits,
  availableTenants,
  onChange
}: LeaseFormFieldsProps) {
  const handleInputChange = (field: string, value: string | number) => {
    onChange(field, value)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4" />
        <h3 className="text-lg font-semibold">Basic Information</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Unit Selection */}
        <FormField 
          label="Select Unit" 
          error={errors.unitId}
          required
        >
          <Select 
            value={formData.unitId} 
            onValueChange={(value) => handleInputChange('unitId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a unit" />
            </SelectTrigger>
            <SelectContent>
              {availableUnits.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        
        {/* Tenant Selection */}
        <FormField 
          label="Select Tenant" 
          error={errors.tenantId}
          required
        >
          <Select 
            value={formData.tenantId} 
            onValueChange={(value) => handleInputChange('tenantId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a tenant" />
            </SelectTrigger>
            <SelectContent>
              {availableTenants.map((tenant) => (
                <SelectItem key={tenant.value} value={tenant.value}>
                  {tenant.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        
        {/* Start Date */}
        <FormField 
          label="Lease Start Date" 
          error={errors.startDate}
          required
        >
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            className={errors.startDate ? "border-red-500" : ""}
          />
        </FormField>
        
        {/* End Date */}
        <FormField 
          label="Lease End Date" 
          error={errors.endDate}
          required
        >
          <Input
            type="date"
            value={formData.endDate}
            onChange={(e) => handleInputChange('endDate', e.target.value)}
            className={errors.endDate ? "border-red-500" : ""}
          />
        </FormField>
        
        {/* Rent Amount */}
        <FormField 
          label="Monthly Rent ($)" 
          error={errors.rentAmount}
          required
        >
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.rentAmount}
            onChange={(e) => handleInputChange('rentAmount', parseFloat(e.target.value) || 0)}
            className={errors.rentAmount ? "border-red-500" : ""}
            placeholder="0.00"
          />
        </FormField>
        
        {/* Security Deposit */}
        <FormField 
          label="Security Deposit ($)" 
          error={errors.securityDeposit}
        >
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.securityDeposit}
            onChange={(e) => handleInputChange('securityDeposit', parseFloat(e.target.value) || 0)}
            className={errors.securityDeposit ? "border-red-500" : ""}
            placeholder="0.00"
          />
        </FormField>
        
        {/* Late Fee Days */}
        <FormField 
          label="Late Fee Grace Period (Days)" 
          error={errors.lateFeeDays}
        >
          <Input
            type="number"
            min="0"
            value={formData.lateFeeDays || 5}
            onChange={(e) => handleInputChange('lateFeeDays', parseInt(e.target.value) || 5)}
            className={errors.lateFeeDays ? "border-red-500" : ""}
            placeholder="5"
          />
        </FormField>
        
        {/* Late Fee Amount */}
        <FormField 
          label="Late Fee Amount ($)" 
          error={errors.lateFeeAmount}
        >
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.lateFeeAmount || 50}
            onChange={(e) => handleInputChange('lateFeeAmount', parseFloat(e.target.value) || 50)}
            className={errors.lateFeeAmount ? "border-red-500" : ""}
            placeholder="50.00"
          />
        </FormField>
        
        {/* Status (for editing) */}
        {formData.status && (
          <FormField 
            label="Lease Status" 
            error={errors.status}
          >
            <Select 
              value={formData.status} 
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        )}
      </div>
      
      {/* Lease Terms */}
      <FormField 
        label="Additional Lease Terms" 
        error={errors.leaseTerms}
      >
        <Textarea
          value={formData.leaseTerms}
          onChange={(e) => handleInputChange('leaseTerms', e.target.value)}
          className={errors.leaseTerms ? "border-red-500" : ""}
          placeholder="Enter any additional lease terms, conditions, or special agreements..."
          rows={4}
        />
      </FormField>
      
      {/* Validation Info */}
      {availableUnits.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No available units found. Please ensure you have vacant units or refresh the data.
          </AlertDescription>
        </Alert>
      )}
      
      {availableTenants.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No available tenants found. Please ensure you have accepted tenants or add new ones.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}