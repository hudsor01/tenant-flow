// Auto-generated from Supabase database schema

// Enum types
export type DocumentType = 'LEASE' | 'INVOICE' | 'RECEIPT' | 'PROPERTY_PHOTO' | 'INSPECTION' | 'MAINTENANCE' | 'OTHER';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
export type LeaseStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type NotificationType = 'PROPERTY' | 'TENANT' | 'MAINTENANCE' | 'PAYMENT' | 'LEASE' | 'SYSTEM';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentType = 'RENT' | 'DEPOSIT' | 'LATE_FEE' | 'MAINTENANCE' | 'OTHER';
export type PlanType = 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'FREE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'EMERGENCY';
export type PropertyType = 'SINGLE_FAMILY' | 'MULTI_UNIT' | 'APARTMENT' | 'COMMERCIAL';
export type RequestStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
export type SubStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE';
export type UnitStatus = 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';
export type UserRole = 'OWNER' | 'MANAGER' | 'TENANT' | 'ADMIN';
export type aal_level = 'aal1' | 'aal2' | 'aal3';
export type action = 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE' | 'ERROR';
export type code_challenge_method = 's256' | 'plain';
export type equality_op = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'in';
export type factor_status = 'unverified' | 'verified';
export type factor_type = 'totp' | 'webauthn' | 'phone';
export type key_status = 'default' | 'valid' | 'invalid' | 'expired';
export type key_type = 'aead-ietf' | 'aead-det' | 'hmacsha512' | 'hmacsha256' | 'auth' | 'shorthash' | 'generichash' | 'kdf' | 'secretbox' | 'secretstream' | 'stream_xchacha20';
export type one_time_token_type = 'confirmation_token' | 'reauthentication_token' | 'recovery_token' | 'email_change_token_new' | 'email_change_token_current' | 'phone_change_token';
export type request_status = 'PENDING' | 'SUCCESS' | 'ERROR';

export interface Database {
  public: {
    Tables: {
      Document: {
        Row: {
          id: string
          name: string
          url: string
          type: DocumentType
          propertyId: string | null
          leaseId: string | null
          createdAt: string | null
          updatedAt: string | null
        }
        Insert: {
          id?: string
          name: string
          url: string
          type: DocumentType
          propertyId: string | null
          leaseId: string | null
          createdAt?: string | null
          updatedAt?: string | null
        }
        Update: {
          id?: string
          name?: string
          url?: string
          type?: DocumentType
          propertyId?: string | null
          leaseId?: string | null
          createdAt?: string | null
          updatedAt?: string | null
        }
      }
      Expense: {
        Row: {
          id: string
          propertyId: string
          maintenanceId: string | null
          amount: number
          category: string
          description: string
          date: string
          receiptUrl: string | null
          vendorName: string | null
          vendorContact: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          propertyId: string
          maintenanceId: string | null
          amount: number
          category: string
          description: string
          date: string
          receiptUrl: string | null
          vendorName: string | null
          vendorContact: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          propertyId?: string
          maintenanceId?: string | null
          amount?: number
          category?: string
          description?: string
          date?: string
          receiptUrl?: string | null
          vendorName?: string | null
          vendorContact?: string | null
          createdAt?: string
          updatedAt?: string
        }
      }
      Inspection: {
        Row: {
          id: string
          propertyId: string
          unitId: string | null
          inspectorId: string
          type: string
          scheduledDate: string
          completedDate: string | null
          status: string
          notes: string | null
          reportUrl: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          propertyId: string
          unitId: string | null
          inspectorId: string
          type?: string
          scheduledDate: string
          completedDate: string | null
          status?: string
          notes: string | null
          reportUrl: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          propertyId?: string
          unitId?: string | null
          inspectorId?: string
          type?: string
          scheduledDate?: string
          completedDate?: string | null
          status?: string
          notes?: string | null
          reportUrl?: string | null
          createdAt?: string
          updatedAt?: string
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
          status: LeaseStatus
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          unitId: string
          tenantId: string
          startDate: string
          endDate: string
          rentAmount: number
          securityDeposit: number
          status?: LeaseStatus
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          unitId?: string
          tenantId?: string
          startDate?: string
          endDate?: string
          rentAmount?: number
          securityDeposit?: number
          status?: LeaseStatus
          createdAt?: string
          updatedAt?: string
        }
      }
      MaintenanceRequest: {
        Row: {
          id: string
          unitId: string
          title: string
          description: string
          priority: Priority
          status: RequestStatus
          createdAt: string
          updatedAt: string
          completedAt: string | null
          assignedTo: string | null
          estimatedCost: number | null
          actualCost: number | null
        }
        Insert: {
          id?: string
          unitId: string
          title: string
          description: string
          priority?: Priority
          status?: RequestStatus
          createdAt?: string
          updatedAt?: string
          completedAt: string | null
          assignedTo: string | null
          estimatedCost: number | null
          actualCost: number | null
        }
        Update: {
          id?: string
          unitId?: string
          title?: string
          description?: string
          priority?: Priority
          status?: RequestStatus
          createdAt?: string
          updatedAt?: string
          completedAt?: string | null
          assignedTo?: string | null
          estimatedCost?: number | null
          actualCost?: number | null
        }
      }
      MaintenanceSummary: {
        Row: {
          propertyId: string | null
          propertyName: string | null
          openRequests: number | null
          inProgressRequests: number | null
          urgentRequests: number | null
          avgResolutionDays: unknown | null
        }
        Insert: {
          propertyId: string | null
          propertyName: string | null
          openRequests: number | null
          inProgressRequests: number | null
          urgentRequests: number | null
          avgResolutionDays: unknown | null
        }
        Update: {
          propertyId?: string | null
          propertyName?: string | null
          openRequests?: number | null
          inProgressRequests?: number | null
          urgentRequests?: number | null
          avgResolutionDays?: unknown | null
        }
      }
      Message: {
        Row: {
          id: string
          threadId: string
          senderId: string
          receiverId: string
          content: string
          readAt: string | null
          attachmentUrl: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          threadId: string
          senderId: string
          receiverId: string
          content: string
          readAt: string | null
          attachmentUrl: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          threadId?: string
          senderId?: string
          receiverId?: string
          content?: string
          readAt?: string | null
          attachmentUrl?: string | null
          createdAt?: string
        }
      }
      Notification: {
        Row: {
          id: string
          title: string
          message: string
          type: NotificationType
          priority: NotificationPriority
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
        }
        Insert: {
          id?: string
          title: string
          message: string
          type: NotificationType
          priority: NotificationPriority
          read?: boolean
          userId: string
          propertyId: string | null
          tenantId: string | null
          leaseId: string | null
          paymentId: string | null
          maintenanceId: string | null
          actionUrl: string | null
          data: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          type?: NotificationType
          priority?: NotificationPriority
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
        }
      }
      Payment: {
        Row: {
          id: string
          leaseId: string
          amount: number
          date: string
          type: PaymentType
          status: PaymentStatus
          notes: string | null
          createdAt: string
          updatedAt: string
          dueDate: string | null
          lateFee: number | null
          stripePaymentIntentId: string | null
          processingFee: unknown | null
        }
        Insert: {
          id?: string
          leaseId: string
          amount: number
          date: string
          type?: PaymentType
          status?: PaymentStatus
          notes: string | null
          createdAt?: string
          updatedAt?: string
          dueDate: string | null
          lateFee?: number | null
          stripePaymentIntentId: string | null
          processingFee?: unknown | null
        }
        Update: {
          id?: string
          leaseId?: string
          amount?: number
          date?: string
          type?: PaymentType
          status?: PaymentStatus
          notes?: string | null
          createdAt?: string
          updatedAt?: string
          dueDate?: string | null
          lateFee?: number | null
          stripePaymentIntentId?: string | null
          processingFee?: unknown | null
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
          propertyType: PropertyType
        }
        Insert: {
          id?: string
          name: string
          address: string
          city: string
          state: string
          zipCode: string
          description: string | null
          imageUrl: string | null
          ownerId: string
          createdAt?: string
          updatedAt?: string
          propertyType?: PropertyType
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
          propertyType?: PropertyType
        }
      }
      PropertyFinancialSummary: {
        Row: {
          propertyId: string | null
          propertyName: string | null
          ownerId: string | null
          totalUnits: number | null
          occupiedUnits: number | null
          monthlyRent: number | null
          currentMonthIncome: number | null
          currentMonthExpenses: number | null
        }
        Insert: {
          propertyId: string | null
          propertyName: string | null
          ownerId: string | null
          totalUnits: number | null
          occupiedUnits: number | null
          monthlyRent: number | null
          currentMonthIncome: number | null
          currentMonthExpenses: number | null
        }
        Update: {
          propertyId?: string | null
          propertyName?: string | null
          ownerId?: string | null
          totalUnits?: number | null
          occupiedUnits?: number | null
          monthlyRent?: number | null
          currentMonthIncome?: number | null
          currentMonthExpenses?: number | null
        }
      }
      Subscription: {
        Row: {
          id: string
          userId: string
          plan: string
          status: SubStatus
          startDate: string
          endDate: string | null
          cancelledAt: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          userId: string
          plan: string
          status: SubStatus
          startDate?: string
          endDate: string | null
          cancelledAt: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          userId?: string
          plan?: string
          status?: SubStatus
          startDate?: string
          endDate?: string | null
          cancelledAt?: string | null
          createdAt?: string
          updatedAt?: string
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
          invitationStatus: InvitationStatus
          invitationToken: string | null
          invitedBy: string | null
          invitedAt: string | null
          acceptedAt: string | null
          expiresAt: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string | null
          emergencyContact: string | null
          userId: string | null
          invitationStatus?: InvitationStatus
          invitationToken: string | null
          invitedBy: string | null
          invitedAt: string | null
          acceptedAt: string | null
          expiresAt: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          emergencyContact?: string | null
          userId?: string | null
          invitationStatus?: InvitationStatus
          invitationToken?: string | null
          invitedBy?: string | null
          invitedAt?: string | null
          acceptedAt?: string | null
          expiresAt?: string | null
          createdAt?: string
          updatedAt?: string
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
          status: UnitStatus
          createdAt: string
          updatedAt: string
          lastInspectionDate: string | null
        }
        Insert: {
          id?: string
          unitNumber: string
          propertyId: string
          bedrooms?: number
          bathrooms?: number
          squareFeet: number | null
          rent: number
          status?: UnitStatus
          createdAt?: string
          updatedAt?: string
          lastInspectionDate: string | null
        }
        Update: {
          id?: string
          unitNumber?: string
          propertyId?: string
          bedrooms?: number
          bathrooms?: number
          squareFeet?: number | null
          rent?: number
          status?: UnitStatus
          createdAt?: string
          updatedAt?: string
          lastInspectionDate?: string | null
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
          role: UserRole
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id: string
          email: string
          name: string | null
          phone: string | null
          bio: string | null
          avatarUrl: string | null
          role?: UserRole
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          phone?: string | null
          bio?: string | null
          avatarUrl?: string | null
          role?: UserRole
          createdAt?: string
          updatedAt?: string
        }
      }
      _schema_upgrades: {
        Row: {
          id: number
          upgrade_name: string
          applied_at: string | null
        }
        Insert: {
          id?: number
          upgrade_name: string
          applied_at?: string | null
        }
        Update: {
          id?: number
          upgrade_name?: string
          applied_at?: string | null
        }
      }
      hypopg_hidden_indexes: {
        Row: {
          indexrelid: unknown | null
          index_name: unknown | null
          schema_name: unknown | null
          table_name: unknown | null
          am_name: unknown | null
          is_hypo: boolean | null
        }
        Insert: {
          indexrelid: unknown | null
          index_name: unknown | null
          schema_name: unknown | null
          table_name: unknown | null
          am_name: unknown | null
          is_hypo: boolean | null
        }
        Update: {
          indexrelid?: unknown | null
          index_name?: unknown | null
          schema_name?: unknown | null
          table_name?: unknown | null
          am_name?: unknown | null
          is_hypo?: boolean | null
        }
      }
      hypopg_list_indexes: {
        Row: {
          indexrelid: unknown | null
          index_name: string | null
          schema_name: unknown | null
          table_name: unknown | null
          am_name: unknown | null
        }
        Insert: {
          indexrelid: unknown | null
          index_name: string | null
          schema_name: unknown | null
          table_name: unknown | null
          am_name: unknown | null
        }
        Update: {
          indexrelid?: unknown | null
          index_name?: string | null
          schema_name?: unknown | null
          table_name?: unknown | null
          am_name?: unknown | null
        }
      }
      us_gaz: {
        Row: {
          id: number
          seq: number | null
          word: string | null
          stdword: string | null
          token: number | null
          is_custom: boolean
        }
        Insert: {
          id?: number
          seq: number | null
          word: string | null
          stdword: string | null
          token: number | null
          is_custom?: boolean
        }
        Update: {
          id?: number
          seq?: number | null
          word?: string | null
          stdword?: string | null
          token?: number | null
          is_custom?: boolean
        }
      }
      us_lex: {
        Row: {
          id: number
          seq: number | null
          word: string | null
          stdword: string | null
          token: number | null
          is_custom: boolean
        }
        Insert: {
          id?: number
          seq: number | null
          word: string | null
          stdword: string | null
          token: number | null
          is_custom?: boolean
        }
        Update: {
          id?: number
          seq?: number | null
          word?: string | null
          stdword?: string | null
          token?: number | null
          is_custom?: boolean
        }
      }
      us_rules: {
        Row: {
          id: number
          rule: string | null
          is_custom: boolean
        }
        Insert: {
          id?: number
          rule: string | null
          is_custom?: boolean
        }
        Update: {
          id?: number
          rule?: string | null
          is_custom?: boolean
        }
      }
      wrappers_fdw_stats: {
        Row: {
          fdw_name: string
          create_times: number | null
          rows_in: number | null
          rows_out: number | null
          bytes_in: number | null
          bytes_out: number | null
          metadata: unknown | null
          created_at: string
          updated_at: string
        }
        Insert: {
          fdw_name: string
          create_times: number | null
          rows_in: number | null
          rows_out: number | null
          bytes_in: number | null
          bytes_out: number | null
          metadata: unknown | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          fdw_name?: string
          create_times?: number | null
          rows_in?: number | null
          rows_out?: number | null
          bytes_in?: number | null
          bytes_out?: number | null
          metadata?: unknown | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}