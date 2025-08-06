/**
 * Generated Supabase Database Types
 *
 * This file is auto-generated. Do not edit manually.
 * Generated at: 2025-07-09T23:48:04.116Z
 *
 * To regenerate types, run: npm run db:types
 */

export interface Database {
  public: {
    Tables: {
      BlogArticle: {
        Row: {
          id: string
          title: string
          slug: string
          description: string
          content: string
          excerpt: string | null
          authorId: string | null
          authorName: string
          metaTitle: string | null
          metaDescription: string | null
          ogImage: string | null
          category: string
          tags: string
          status: string
          featured: boolean
          publishedAt: string | null
          viewCount: number
          readTime: number | null
          searchKeywords: string
          lastIndexed: string | null
          createdAt: string
          updatedAt: string
          author: string | null
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description: string
          content: string
          excerpt?: string | null
          authorId?: string | null
          authorName: string
          metaTitle?: string | null
          metaDescription?: string | null
          ogImage?: string | null
          category: string
          tags: string
          status: string
          featured: boolean
          publishedAt?: string | null
          viewCount: number
          readTime?: number | null
          searchKeywords: string
          lastIndexed?: string | null
          createdAt?: string
          updatedAt?: string
          author?: string | null
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string
          content?: string
          excerpt?: string | null
          authorId?: string | null
          authorName?: string
          metaTitle?: string | null
          metaDescription?: string | null
          ogImage?: string | null
          category?: string
          tags?: string
          status?: string
          featured?: boolean
          publishedAt?: string | null
          viewCount?: number
          readTime?: number | null
          searchKeywords?: string
          lastIndexed?: string | null
          createdAt?: string
          updatedAt?: string
          author?: string | null
        }
      }
      Unit: {
        Row: {
          id: string
          unitNumber: string
          propertyId: string
          bedrooms: number
          bathrooms: number
          squareFeet: number | null
          rent: number
          status: string
          createdAt: string
          updatedAt: string
          lastInspectionDate: string | null
          Inspection: string
          Lease: string
          MaintenanceRequest: string
          Property: string
        }
        Insert: {
          id?: string
          unitNumber: string
          propertyId: string
          bedrooms: number
          bathrooms: number
          squareFeet?: number | null
          rent: number
          status: string
          createdAt?: string
          updatedAt?: string
          lastInspectionDate?: string | null
          Inspection: string
          Lease: string
          MaintenanceRequest: string
          Property: string
        }
        Update: {
          id?: string
          unitNumber?: string
          propertyId?: string
          bedrooms?: number
          bathrooms?: number
          squareFeet?: number | null
          rent?: number
          status?: string
          createdAt?: string
          updatedAt?: string
          lastInspectionDate?: string | null
          Inspection?: string
          Lease?: string
          MaintenanceRequest?: string
          Property?: string
        }
      }
      Property: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          state: string
          zipCode: string
          description: string | null
          imageUrl: string | null
          ownerId: string
          createdAt: string
          updatedAt: string
          propertyType: string
          Document: string
          Expense: string
          Inspection: string
          Notification: string
          User: string
          Unit: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          city: string
          state: string
          zipCode: string
          description?: string | null
          imageUrl?: string | null
          ownerId: string
          createdAt?: string
          updatedAt?: string
          propertyType: string
          Document: string
          Expense: string
          Inspection: string
          Notification: string
          User: string
          Unit: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          city?: string
          state?: string
          zipCode?: string
          description?: string | null
          imageUrl?: string | null
          ownerId?: string
          createdAt?: string
          updatedAt?: string
          propertyType?: string
          Document?: string
          Expense?: string
          Inspection?: string
          Notification?: string
          User?: string
          Unit?: string
        }
      }
      Tenant: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          emergencyContact: string | null
          userId: string | null
          invitationStatus: string
          invitationToken: string | null
          invitedBy: string | null
          invitedAt: string | null
          acceptedAt: string | null
          expiresAt: string | null
          createdAt: string
          updatedAt: string
          Lease: string
          User: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          emergencyContact?: string | null
          userId?: string | null
          invitationStatus: string
          invitationToken?: string | null
          invitedBy?: string | null
          invitedAt?: string | null
          acceptedAt?: string | null
          expiresAt?: string | null
          createdAt?: string
          updatedAt?: string
          Lease: string
          User?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          emergencyContact?: string | null
          userId?: string | null
          invitationStatus?: string
          invitationToken?: string | null
          invitedBy?: string | null
          invitedAt?: string | null
          acceptedAt?: string | null
          expiresAt?: string | null
          createdAt?: string
          updatedAt?: string
          Lease?: string
          User?: string | null
        }
      }
      Lease: {
        Row: {
          id: string
          unitId: string
          tenantId: string
          startDate: string
          endDate: string
          rentAmount: number
          securityDeposit: number
          status: string
          createdAt: string
          updatedAt: string
          Document: string
          Tenant: string
          Unit: string
          Payment: string
        }
        Insert: {
          id?: string
          unitId: string
          tenantId: string
          startDate: string
          endDate: string
          rentAmount: number
          securityDeposit: number
          status: string
          createdAt?: string
          updatedAt?: string
          Document: string
          Tenant: string
          Unit: string
          Payment: string
        }
        Update: {
          id?: string
          unitId?: string
          tenantId?: string
          startDate?: string
          endDate?: string
          rentAmount?: number
          securityDeposit?: number
          status?: string
          createdAt?: string
          updatedAt?: string
          Document?: string
          Tenant?: string
          Unit?: string
          Payment?: string
        }
      }
      Payment: {
        Row: {
          id: string
          leaseId: string
          amount: number
          date: string
          type: string
          status: string
          notes: string | null
          createdAt: string
          updatedAt: string
          dueDate: string | null
          lateFee: number | null
          stripePaymentIntentId: string | null
          processingFee: number | null
          Lease: string
        }
        Insert: {
          id?: string
          leaseId: string
          amount: number
          date: string
          type: string
          status: string
          notes?: string | null
          createdAt?: string
          updatedAt?: string
          dueDate?: string | null
          lateFee?: number | null
          stripePaymentIntentId?: string | null
          processingFee?: number | null
          Lease: string
        }
        Update: {
          id?: string
          leaseId?: string
          amount?: number
          date?: string
          type?: string
          status?: string
          notes?: string | null
          createdAt?: string
          updatedAt?: string
          dueDate?: string | null
          lateFee?: number | null
          stripePaymentIntentId?: string | null
          processingFee?: number | null
          Lease?: string
        }
      }
      MaintenanceRequest: {
        Row: {
          id: string
          unitId: string
          title: string
          description: string
          priority: string
          status: string
          createdAt: string
          updatedAt: string
          completedAt: string | null
          assignedTo: string | null
          estimatedCost: number | null
          actualCost: number | null
          Expense: string
          Unit: string
        }
        Insert: {
          id?: string
          unitId: string
          title: string
          description: string
          priority: string
          status: string
          createdAt?: string
          updatedAt?: string
          completedAt?: string | null
          assignedTo?: string | null
          estimatedCost?: number | null
          actualCost?: number | null
          Expense: string
          Unit: string
        }
        Update: {
          id?: string
          unitId?: string
          title?: string
          description?: string
          priority?: string
          status?: string
          createdAt?: string
          updatedAt?: string
          completedAt?: string | null
          assignedTo?: string | null
          estimatedCost?: number | null
          actualCost?: number | null
          Expense?: string
          Unit?: string
        }
      }
      Notification: {
        Row: {
          id: string
          title: string
          message: string
          type: string
          priority: string
          read: boolean
          userId: string
          propertyId: string | null
          tenantId: string | null
          leaseId: string | null
          paymentId: string | null
          maintenanceId: string | null
          actionUrl: string | null
          data: string | null
          createdAt: string
          updatedAt: string
          Property: string | null
          User: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          type: string
          priority: string
          read: boolean
          userId: string
          propertyId?: string | null
          tenantId?: string | null
          leaseId?: string | null
          paymentId?: string | null
          maintenanceId?: string | null
          actionUrl?: string | null
          data?: string | null
          createdAt?: string
          updatedAt?: string
          Property?: string | null
          User: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          type?: string
          priority?: string
          read?: boolean
          userId?: string
          propertyId?: string | null
          tenantId?: string | null
          leaseId?: string | null
          paymentId?: string | null
          maintenanceId?: string | null
          actionUrl?: string | null
          data?: string | null
          createdAt?: string
          updatedAt?: string
          Property?: string | null
          User?: string
        }
      }
      User: {
        Row: {
          id: string
          email: string
          name: string | null
          phone: string | null
          bio: string | null
          avatarUrl: string | null
          role: string
          createdAt: string
          updatedAt: string
          BlogArticle: string
          Inspection: string
          Invoice: string
          LeaseGeneratorUsage: string
          Message_Message_receiverIdToUser: string
          Message_Message_senderIdToUser: string
          Notification: string
          Property: string
          Subscription: string
          Tenant: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          phone?: string | null
          bio?: string | null
          avatarUrl?: string | null
          role: string
          createdAt?: string
          updatedAt?: string
          BlogArticle: string
          Inspection: string
          Invoice: string
          LeaseGeneratorUsage: string
          Message_Message_receiverIdToUser: string
          Message_Message_senderIdToUser: string
          Notification: string
          Property: string
          Subscription: string
          Tenant: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          phone?: string | null
          bio?: string | null
          avatarUrl?: string | null
          role?: string
          createdAt?: string
          updatedAt?: string
          BlogArticle?: string
          Inspection?: string
          Invoice?: string
          LeaseGeneratorUsage?: string
          Message_Message_receiverIdToUser?: string
          Message_Message_senderIdToUser?: string
          Notification?: string
          Property?: string
          Subscription?: string
          Tenant?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      BlogCategory: 'PROPERTY_MANAGEMENT' | 'LEGAL_COMPLIANCE' | 'FINANCIAL_MANAGEMENT' | 'PROPERTY_MAINTENANCE' | 'SOFTWARE_REVIEWS' | 'TENANT_RELATIONS' | 'MARKETING' | 'REAL_ESTATE_INVESTMENT' | 'TAX_PLANNING' | 'AUTOMATION'
      BlogStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'SCHEDULED'
      CustomerInvoiceStatus: 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'OVERDUE' | 'CANCELLED'
      DocumentType: 'LEASE' | 'INVOICE' | 'RECEIPT' | 'PROPERTY_PHOTO' | 'INSPECTION' | 'MAINTENANCE' | 'OTHER'
      InvitationStatus: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
      LeaseStatus: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
      NotificationPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
      NotificationType: 'PROPERTY' | 'TENANT' | 'MAINTENANCE' | 'PAYMENT' | 'LEASE' | 'SYSTEM'
      PaymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
      PaymentType: 'RENT' | 'DEPOSIT' | 'LATE_FEE' | 'MAINTENANCE' | 'OTHER'
      PlanType: 'FREETRIAL' | 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'
      Priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'EMERGENCY'
      PropertyType: 'SINGLE_FAMILY' | 'MULTI_UNIT' | 'APARTMENT' | 'COMMERCIAL'
      RequestStatus: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED'
      SubStatus: 'ACTIVE' | 'CANCELED' | 'PAST_DUE'
      UnitStatus: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
      UserRole: 'OWNER' | 'MANAGER' | 'TENANT' | 'ADMIN'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
