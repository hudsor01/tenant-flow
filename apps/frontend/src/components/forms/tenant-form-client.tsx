/**
 * Tenant Form Client Component
 * 
 * Client-side form logic with React Query integration.
 * Handles form state, validation, and mutations with optimistic updates.
 */

"use client"

import React, { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { CreateTenantInput, UpdateTenantInput, Tenant } from '@repo/shared'
import { useCreateTenant, useUpdateTenant } from '@/hooks/api/use-tenants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/primitives'
import { Save, X, User, AlertCircle } from 'lucide-react'
import { TenantFormFields } from './tenant-form-fields'

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

interface TenantFormClientProps {
  tenant?: Tenant
  mode: 'create' | 'edit'
  title: string
  description: string
  onSuccess?: (tenant: Tenant) => void
  onClose?: () => void
  className?: string
}

export function TenantFormClient({
  tenant,
  mode,
  title,
  description,
  onSuccess,
  onClose,
  className
}: TenantFormClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = mode === 'edit' && Boolean(tenant)

  // React Query mutations with optimistic updates
  const createMutation = useCreateTenant()
  const updateMutation = useUpdateTenant()

  // Form state
  const [formData, setFormData] = useState<CreateTenantInput | UpdateTenantInput>(() => {
    if (isEditing && tenant) {
      return {
        name: tenant.name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        emergencyContact: tenant.emergencyContact || '',
        emergencyPhone: '', // Not in Tenant interface, will be part of input only
        moveInDate: '', // Not in Tenant interface, will be part of input only
        moveOutDate: isEditing ? '' : undefined, // Only for editing
        notes: '' // Not in Tenant interface, will be part of input only
      }
    }
    return {
      name: '',
      email: '',
      phone: '',
      emergencyContact: '',
      emergencyPhone: '',
      moveInDate: '',
      notes: ''
    }
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form handlers
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Required fields validation
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Date validation
    if (formData.moveInDate && (formData as UpdateTenantInput).moveOutDate) {
      const moveIn = new Date(formData.moveInDate)
      const moveOut = new Date((formData as UpdateTenantInput).moveOutDate!)
      if (moveOut <= moveIn) {
        newErrors.moveOutDate = 'Move-out date must be after move-in date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    startTransition(async () => {
      try {
        if (isEditing && tenant) {
          // Update existing tenant
          const updatedTenant = await updateMutation.mutateAsync({
            id: tenant.id,
            data: formData as UpdateTenantInput
          })
          onSuccess?.(updatedTenant)
        } else {
          // Create new tenant
          const newTenant = await createMutation.mutateAsync(formData as CreateTenantInput)
          onSuccess?.(newTenant)
        }
        
        // Reset form for create mode
        if (!isEditing) {
          setFormData({
            name: '',
            email: '',
            phone: '',
            emergencyContact: '',
            emergencyPhone: '',
            moveInDate: '',
            notes: ''
          })
        }
      } catch (error) {
        console.error('Form submission error:', error)
        // Error handling is done by React Query hooks
      }
    })
  }

  const handleCancel = () => {
    if (onClose) {
      onClose()
    } else {
      router.back()
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending || isPending
  const mutation = isEditing ? updateMutation : createMutation

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("w-full max-w-2xl mx-auto", className)}
    >
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Form Header */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{title}</h2>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            </div>

            {/* Global Error */}
            {mutation.error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {mutation.error.message || 'An error occurred. Please try again.'}
                </p>
              </motion.div>
            )}

            {/* Form Fields */}
            <TenantFormFields
              formData={formData}
              errors={errors}
              isEditing={isEditing}
              onChange={handleFieldChange}
            />

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {isEditing ? 'Update Tenant' : 'Create Tenant'}
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}