import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import type { MaintenanceRequest } from '@/types/entities'

interface MaintenanceNotificationRequest {
  type: 'new_request' | 'status_update' | 'emergency_alert'
  maintenanceRequest: {
    id: string
    title: string
    description: string
    category: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
    status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED'
    createdAt: string
    unit: {
      unitNumber: string
      property: {
        name: string
        address: string
      }
    }
    tenant?: {
      name: string
      email: string
    }
  }
  recipient: {
    email: string
    name: string
    role: 'owner' | 'tenant'
  }
  actionUrl?: string
}

export function useSendMaintenanceNotification() {
  return useMutation({
    mutationFn: async (request: MaintenanceNotificationRequest) => {
      logger.apiCall('POST', '/functions/maintenance-notification', { 
        type: request.type, 
        maintenanceId: request.maintenanceRequest.id,
        recipientRole: request.recipient.role 
      })

      const { data, error } = await supabase.functions.invoke('maintenance-notification', {
        body: request,
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (error) {
        throw new Error(error.message || 'Failed to send maintenance notification')
      }

      return data
    },
    onSuccess: (data, variables) => {
      logger.debug('Maintenance notification sent successfully', {
        emailId: data.emailId,
        type: variables.type,
        maintenanceId: variables.maintenanceRequest.id
      })
    },
    onError: (error, variables) => {
      logger.error('Failed to send maintenance notification', error as Error, {
        type: variables.type,
        maintenanceId: variables.maintenanceRequest.id,
        recipientEmail: variables.recipient.email
      })
      
      // Show user-friendly error toast
      toast.error('Failed to send notification', {
        description: 'The maintenance request was saved, but we couldn\'t send the email notification.'
      })
    }
  })
}

// Helper function to create notification request from maintenance request
export function createMaintenanceNotification(
  maintenanceRequest: MaintenanceRequest & {
    unit: {
      unitNumber: string
      property: {
        name: string
        address: string
      }
    }
    tenant?: {
      name: string
      email: string
    }
  },
  recipient: { email: string; name: string; role: 'owner' | 'tenant' },
  type: 'new_request' | 'status_update' | 'emergency_alert' = 'new_request',
  actionUrl?: string
): MaintenanceNotificationRequest {
  return {
    type,
    maintenanceRequest: {
      id: maintenanceRequest.id,
      title: maintenanceRequest.title,
      description: maintenanceRequest.description,
      category: maintenanceRequest.category || 'other',
      priority: maintenanceRequest.priority,
      status: maintenanceRequest.status,
      createdAt: maintenanceRequest.createdAt,
      unit: maintenanceRequest.unit,
      tenant: maintenanceRequest.tenant
    },
    recipient,
    actionUrl
  }
}

// Auto-determine notification type based on priority and status
export function getNotificationType(
  priority: MaintenanceRequest['priority'], 
  isNewRequest: boolean = true
): 'new_request' | 'status_update' | 'emergency_alert' {
  if (priority === 'EMERGENCY') {
    return 'emergency_alert'
  }
  
  return isNewRequest ? 'new_request' : 'status_update'
}