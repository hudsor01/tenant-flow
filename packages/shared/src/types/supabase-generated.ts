export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      _BlogArticleToBlogTag: {
        Row: {
          A: string
          B: string
        }
        Insert: {
          A: string
          B: string
        }
        Update: {
          A?: string
          B?: string
        }
        Relationships: [
          {
            foreignKeyName: "_BlogArticleToBlogTag_A_fkey"
            columns: ["A"]
            isOneToOne: false
            referencedRelation: "BlogArticle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "_BlogArticleToBlogTag_B_fkey"
            columns: ["B"]
            isOneToOne: false
            referencedRelation: "BlogTag"
            referencedColumns: ["id"]
          },
        ]
      }
      Activity: {
        Row: {
          action: string
          createdAt: string
          entityId: string
          entityName: string | null
          entityType: Database["public"]["Enums"]["ActivityEntityType"]
          id: string
          userId: string
        }
        Insert: {
          action: string
          createdAt?: string
          entityId: string
          entityName?: string | null
          entityType: Database["public"]["Enums"]["ActivityEntityType"]
          id?: string
          userId: string
        }
        Update: {
          action?: string
          createdAt?: string
          entityId?: string
          entityName?: string | null
          entityType?: Database["public"]["Enums"]["ActivityEntityType"]
          id?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Activity_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      BlogArticle: {
        Row: {
          authorFirstName: string | null
          authorId: string | null
          authorLastName: string | null
          authorName: string | null
          category: Database["public"]["Enums"]["BlogCategory"]
          content: string
          createdAt: string
          description: string
          excerpt: string | null
          featured: boolean
          id: string
          lastIndexed: string | null
          metaDescription: string | null
          metaTitle: string | null
          ogImage: string | null
          publishedAt: string | null
          readTime: number | null
          searchKeywords: string[] | null
          slug: string
          status: Database["public"]["Enums"]["BlogStatus"]
          title: string
          updatedAt: string
          viewCount: number
        }
        Insert: {
          authorFirstName?: string | null
          authorId?: string | null
          authorLastName?: string | null
          authorName?: string | null
          category?: Database["public"]["Enums"]["BlogCategory"]
          content: string
          createdAt?: string
          description: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          lastIndexed?: string | null
          metaDescription?: string | null
          metaTitle?: string | null
          ogImage?: string | null
          publishedAt?: string | null
          readTime?: number | null
          searchKeywords?: string[] | null
          slug: string
          status?: Database["public"]["Enums"]["BlogStatus"]
          title: string
          updatedAt?: string
          viewCount?: number
        }
        Update: {
          authorFirstName?: string | null
          authorId?: string | null
          authorLastName?: string | null
          authorName?: string | null
          category?: Database["public"]["Enums"]["BlogCategory"]
          content?: string
          createdAt?: string
          description?: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          lastIndexed?: string | null
          metaDescription?: string | null
          metaTitle?: string | null
          ogImage?: string | null
          publishedAt?: string | null
          readTime?: number | null
          searchKeywords?: string[] | null
          slug?: string
          status?: Database["public"]["Enums"]["BlogStatus"]
          title?: string
          updatedAt?: string
          viewCount?: number
        }
        Relationships: [
          {
            foreignKeyName: "BlogArticle_authorId_fkey"
            columns: ["authorId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      BlogTag: {
        Row: {
          color: string | null
          createdAt: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          createdAt?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          createdAt?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      CustomerInvoice: {
        Row: {
          businessAddress: string | null
          businessCity: string | null
          businessEmail: string
          businessLogo: string | null
          businessName: string
          businessPhone: string | null
          businessState: string | null
          businessZip: string | null
          clientAddress: string | null
          clientCity: string | null
          clientEmail: string
          clientName: string
          clientState: string | null
          clientZip: string | null
          createdAt: string
          downloadCount: number
          dueDate: string
          emailCaptured: string | null
          id: string
          invoiceNumber: string
          ipAddress: string | null
          isProVersion: boolean
          issueDate: string
          notes: string | null
          status: Database["public"]["Enums"]["CustomerInvoiceStatus"]
          subtotal: number
          taxAmount: number
          taxRate: number
          terms: string | null
          total: number
          updatedAt: string
          userAgent: string | null
        }
        Insert: {
          businessAddress?: string | null
          businessCity?: string | null
          businessEmail: string
          businessLogo?: string | null
          businessName: string
          businessPhone?: string | null
          businessState?: string | null
          businessZip?: string | null
          clientAddress?: string | null
          clientCity?: string | null
          clientEmail: string
          clientName: string
          clientState?: string | null
          clientZip?: string | null
          createdAt?: string
          downloadCount?: number
          dueDate: string
          emailCaptured?: string | null
          id?: string
          invoiceNumber: string
          ipAddress?: string | null
          isProVersion?: boolean
          issueDate?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["CustomerInvoiceStatus"]
          subtotal?: number
          taxAmount?: number
          taxRate?: number
          terms?: string | null
          total?: number
          updatedAt?: string
          userAgent?: string | null
        }
        Update: {
          businessAddress?: string | null
          businessCity?: string | null
          businessEmail?: string
          businessLogo?: string | null
          businessName?: string
          businessPhone?: string | null
          businessState?: string | null
          businessZip?: string | null
          clientAddress?: string | null
          clientCity?: string | null
          clientEmail?: string
          clientName?: string
          clientState?: string | null
          clientZip?: string | null
          createdAt?: string
          downloadCount?: number
          dueDate?: string
          emailCaptured?: string | null
          id?: string
          invoiceNumber?: string
          ipAddress?: string | null
          isProVersion?: boolean
          issueDate?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["CustomerInvoiceStatus"]
          subtotal?: number
          taxAmount?: number
          taxRate?: number
          terms?: string | null
          total?: number
          updatedAt?: string
          userAgent?: string | null
        }
        Relationships: []
      }
      CustomerInvoiceItem: {
        Row: {
          createdAt: string
          description: string
          id: string
          invoiceId: string
          quantity: number
          total: number
          unitPrice: number
        }
        Insert: {
          createdAt?: string
          description: string
          id?: string
          invoiceId: string
          quantity: number
          total: number
          unitPrice: number
        }
        Update: {
          createdAt?: string
          description?: string
          id?: string
          invoiceId?: string
          quantity?: number
          total?: number
          unitPrice?: number
        }
        Relationships: [
          {
            foreignKeyName: "CustomerInvoiceItem_invoiceId_fkey"
            columns: ["invoiceId"]
            isOneToOne: false
            referencedRelation: "CustomerInvoice"
            referencedColumns: ["id"]
          },
        ]
      }
      Document: {
        Row: {
          createdAt: string | null
          filename: string | null
          fileSizeBytes: number
          id: string
          leaseId: string | null
          mimeType: string | null
          name: string
          propertyId: string | null
          size: number | null
          type: Database["public"]["Enums"]["DocumentType"]
          updatedAt: string | null
          url: string
        }
        Insert: {
          createdAt?: string | null
          filename?: string | null
          fileSizeBytes?: number
          id?: string
          leaseId?: string | null
          mimeType?: string | null
          name: string
          propertyId?: string | null
          size?: number | null
          type: Database["public"]["Enums"]["DocumentType"]
          updatedAt?: string | null
          url: string
        }
        Update: {
          createdAt?: string | null
          filename?: string | null
          fileSizeBytes?: number
          id?: string
          leaseId?: string | null
          mimeType?: string | null
          name?: string
          propertyId?: string | null
          size?: number | null
          type?: Database["public"]["Enums"]["DocumentType"]
          updatedAt?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "Document_leaseId_fkey"
            columns: ["leaseId"]
            isOneToOne: false
            referencedRelation: "Lease"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Document_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
        ]
      }
      Expense: {
        Row: {
          amount: number
          category: string
          createdAt: string
          date: string
          description: string
          id: string
          maintenanceId: string | null
          propertyId: string
          receiptUrl: string | null
          updatedAt: string
          vendorContact: string | null
          vendorName: string | null
        }
        Insert: {
          amount: number
          category: string
          createdAt?: string
          date: string
          description: string
          id?: string
          maintenanceId?: string | null
          propertyId: string
          receiptUrl?: string | null
          updatedAt?: string
          vendorContact?: string | null
          vendorName?: string | null
        }
        Update: {
          amount?: number
          category?: string
          createdAt?: string
          date?: string
          description?: string
          id?: string
          maintenanceId?: string | null
          propertyId?: string
          receiptUrl?: string | null
          updatedAt?: string
          vendorContact?: string | null
          vendorName?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Expense_maintenanceId_fkey"
            columns: ["maintenanceId"]
            isOneToOne: false
            referencedRelation: "MaintenanceRequest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Expense_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
        ]
      }
      FailedWebhookEvent: {
        Row: {
          createdAt: string
          eventId: string
          eventType: string
          failureCount: number
          failureReason: string
          firstFailedAt: string
          id: string
          lastRetryAt: string | null
          nextRetryAt: string | null
          payload: string
          signature: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          eventId: string
          eventType: string
          failureCount?: number
          failureReason: string
          firstFailedAt?: string
          id?: string
          lastRetryAt?: string | null
          nextRetryAt?: string | null
          payload: string
          signature: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          eventId?: string
          eventType?: string
          failureCount?: number
          failureReason?: string
          firstFailedAt?: string
          id?: string
          lastRetryAt?: string | null
          nextRetryAt?: string | null
          payload?: string
          signature?: string
          updatedAt?: string
        }
        Relationships: []
      }
      File: {
        Row: {
          createdAt: string
          filename: string
          id: string
          maintenanceRequestId: string | null
          mimeType: string
          originalName: string
          propertyId: string | null
          size: number | null
          uploadedById: string | null
          url: string
        }
        Insert: {
          createdAt?: string
          filename: string
          id?: string
          maintenanceRequestId?: string | null
          mimeType: string
          originalName: string
          propertyId?: string | null
          size?: number | null
          uploadedById?: string | null
          url: string
        }
        Update: {
          createdAt?: string
          filename?: string
          id?: string
          maintenanceRequestId?: string | null
          mimeType?: string
          originalName?: string
          propertyId?: string | null
          size?: number | null
          uploadedById?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "File_maintenanceRequestId_fkey"
            columns: ["maintenanceRequestId"]
            isOneToOne: false
            referencedRelation: "MaintenanceRequest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "File_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "File_uploadedById_fkey"
            columns: ["uploadedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Inspection: {
        Row: {
          completedDate: string | null
          createdAt: string
          id: string
          inspectorId: string
          notes: string | null
          propertyId: string
          reportUrl: string | null
          scheduledDate: string
          status: string
          type: string
          unitId: string | null
          updatedAt: string
        }
        Insert: {
          completedDate?: string | null
          createdAt?: string
          id?: string
          inspectorId: string
          notes?: string | null
          propertyId: string
          reportUrl?: string | null
          scheduledDate: string
          status?: string
          type?: string
          unitId?: string | null
          updatedAt?: string
        }
        Update: {
          completedDate?: string | null
          createdAt?: string
          id?: string
          inspectorId?: string
          notes?: string | null
          propertyId?: string
          reportUrl?: string | null
          scheduledDate?: string
          status?: string
          type?: string
          unitId?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Inspection_inspectorId_fkey"
            columns: ["inspectorId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Inspection_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Inspection_unitId_fkey"
            columns: ["unitId"]
            isOneToOne: false
            referencedRelation: "Unit"
            referencedColumns: ["id"]
          },
        ]
      }
      Invoice: {
        Row: {
          amountDue: number
          amountPaid: number
          createdAt: string
          currency: string
          description: string | null
          dueDate: string | null
          id: string
          invoiceDate: string
          invoiceNumber: string | null
          invoicePdf: string | null
          invoiceUrl: string | null
          paidAt: string | null
          status: string
          stripeInvoiceId: string
          subscriptionId: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          amountDue: number
          amountPaid: number
          createdAt?: string
          currency?: string
          description?: string | null
          dueDate?: string | null
          id?: string
          invoiceDate: string
          invoiceNumber?: string | null
          invoicePdf?: string | null
          invoiceUrl?: string | null
          paidAt?: string | null
          status: string
          stripeInvoiceId: string
          subscriptionId?: string | null
          updatedAt?: string
          userId: string
        }
        Update: {
          amountDue?: number
          amountPaid?: number
          createdAt?: string
          currency?: string
          description?: string | null
          dueDate?: string | null
          id?: string
          invoiceDate?: string
          invoiceNumber?: string | null
          invoicePdf?: string | null
          invoiceUrl?: string | null
          paidAt?: string | null
          status?: string
          stripeInvoiceId?: string
          subscriptionId?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Invoice_subscriptionId_fkey"
            columns: ["subscriptionId"]
            isOneToOne: false
            referencedRelation: "Subscription"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Invoice_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      InvoiceLeadCapture: {
        Row: {
          campaign: string | null
          company: string | null
          converted: boolean
          createdAt: string
          email: string
          emailOpened: boolean
          emailSent: boolean
          firstName: string | null
          id: string
          invoiceId: string | null
          lastName: string | null
          linkClicked: boolean
          medium: string | null
          source: string | null
          updatedAt: string
        }
        Insert: {
          campaign?: string | null
          company?: string | null
          converted?: boolean
          createdAt?: string
          email: string
          emailOpened?: boolean
          emailSent?: boolean
          firstName?: string | null
          id?: string
          invoiceId?: string | null
          lastName?: string | null
          linkClicked?: boolean
          medium?: string | null
          source?: string | null
          updatedAt?: string
        }
        Update: {
          campaign?: string | null
          company?: string | null
          converted?: boolean
          createdAt?: string
          email?: string
          emailOpened?: boolean
          emailSent?: boolean
          firstName?: string | null
          id?: string
          invoiceId?: string | null
          lastName?: string | null
          linkClicked?: boolean
          medium?: string | null
          source?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      Lease: {
        Row: {
          createdAt: string
          endDate: string
          id: string
          monthlyRent: number | null
          propertyId: string | null
          rentAmount: number
          securityDeposit: number
          startDate: string
          status: Database["public"]["Enums"]["LeaseStatus"]
          tenantId: string
          terms: string | null
          unitId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          endDate: string
          id?: string
          monthlyRent?: number | null
          propertyId?: string | null
          rentAmount: number
          securityDeposit: number
          startDate: string
          status?: Database["public"]["Enums"]["LeaseStatus"]
          tenantId: string
          terms?: string | null
          unitId: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          endDate?: string
          id?: string
          monthlyRent?: number | null
          propertyId?: string | null
          rentAmount?: number
          securityDeposit?: number
          startDate?: string
          status?: Database["public"]["Enums"]["LeaseStatus"]
          tenantId?: string
          terms?: string | null
          unitId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Lease_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Lease_unitId_fkey"
            columns: ["unitId"]
            isOneToOne: false
            referencedRelation: "Unit"
            referencedColumns: ["id"]
          },
        ]
      }
      LeaseGeneratorUsage: {
        Row: {
          accessExpiresAt: string | null
          amountPaid: number | null
          createdAt: string | null
          currency: string | null
          email: string
          id: string
          ipAddress: string | null
          paymentDate: string | null
          paymentStatus: string | null
          stripeCustomerId: string | null
          stripeSessionId: string | null
          updatedAt: string | null
          usageCount: number | null
          userAgent: string | null
          userId: string | null
        }
        Insert: {
          accessExpiresAt?: string | null
          amountPaid?: number | null
          createdAt?: string | null
          currency?: string | null
          email: string
          id?: string
          ipAddress?: string | null
          paymentDate?: string | null
          paymentStatus?: string | null
          stripeCustomerId?: string | null
          stripeSessionId?: string | null
          updatedAt?: string | null
          usageCount?: number | null
          userAgent?: string | null
          userId?: string | null
        }
        Update: {
          accessExpiresAt?: string | null
          amountPaid?: number | null
          createdAt?: string | null
          currency?: string | null
          email?: string
          id?: string
          ipAddress?: string | null
          paymentDate?: string | null
          paymentStatus?: string | null
          stripeCustomerId?: string | null
          stripeSessionId?: string | null
          updatedAt?: string | null
          usageCount?: number | null
          userAgent?: string | null
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "LeaseGeneratorUsage_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      MaintenanceRequest: {
        Row: {
          actualCost: number | null
          allowEntry: boolean
          assignedTo: string | null
          category: string | null
          completedAt: string | null
          contactPhone: string | null
          createdAt: string
          description: string
          estimatedCost: number | null
          id: string
          notes: string | null
          photos: string[] | null
          preferredDate: string | null
          priority: Database["public"]["Enums"]["Priority"]
          requestedBy: string | null
          status: Database["public"]["Enums"]["RequestStatus"]
          title: string
          unitId: string
          updatedAt: string
        }
        Insert: {
          actualCost?: number | null
          allowEntry?: boolean
          assignedTo?: string | null
          category?: string | null
          completedAt?: string | null
          contactPhone?: string | null
          createdAt?: string
          description: string
          estimatedCost?: number | null
          id?: string
          notes?: string | null
          photos?: string[] | null
          preferredDate?: string | null
          priority?: Database["public"]["Enums"]["Priority"]
          requestedBy?: string | null
          status?: Database["public"]["Enums"]["RequestStatus"]
          title: string
          unitId: string
          updatedAt?: string
        }
        Update: {
          actualCost?: number | null
          allowEntry?: boolean
          assignedTo?: string | null
          category?: string | null
          completedAt?: string | null
          contactPhone?: string | null
          createdAt?: string
          description?: string
          estimatedCost?: number | null
          id?: string
          notes?: string | null
          photos?: string[] | null
          preferredDate?: string | null
          priority?: Database["public"]["Enums"]["Priority"]
          requestedBy?: string | null
          status?: Database["public"]["Enums"]["RequestStatus"]
          title?: string
          unitId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "MaintenanceRequest_unitId_fkey"
            columns: ["unitId"]
            isOneToOne: false
            referencedRelation: "Unit"
            referencedColumns: ["id"]
          },
        ]
      }
      Message: {
        Row: {
          attachmentUrl: string | null
          content: string
          createdAt: string
          id: string
          readAt: string | null
          receiverId: string
          senderId: string
          threadId: string
        }
        Insert: {
          attachmentUrl?: string | null
          content: string
          createdAt?: string
          id?: string
          readAt?: string | null
          receiverId: string
          senderId: string
          threadId: string
        }
        Update: {
          attachmentUrl?: string | null
          content?: string
          createdAt?: string
          id?: string
          readAt?: string | null
          receiverId?: string
          senderId?: string
          threadId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Message_receiverId_fkey"
            columns: ["receiverId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Message_senderId_fkey"
            columns: ["senderId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      NotificationLogs: {
        Row: {
          content: string | null
          createdAt: string
          deliveredAt: string | null
          errorMessage: string | null
          id: string
          leaseId: string | null
          metadata: Json | null
          openedAt: string | null
          recipientEmail: string | null
          recipientName: string | null
          reminderType: string | null
          retryCount: number | null
          sentAt: string | null
          status: string | null
          subject: string | null
          subscriptionId: string | null
          type: string
          updatedAt: string
          userId: string
        }
        Insert: {
          content?: string | null
          createdAt?: string
          deliveredAt?: string | null
          errorMessage?: string | null
          id?: string
          leaseId?: string | null
          metadata?: Json | null
          openedAt?: string | null
          recipientEmail?: string | null
          recipientName?: string | null
          reminderType?: string | null
          retryCount?: number | null
          sentAt?: string | null
          status?: string | null
          subject?: string | null
          subscriptionId?: string | null
          type: string
          updatedAt?: string
          userId: string
        }
        Update: {
          content?: string | null
          createdAt?: string
          deliveredAt?: string | null
          errorMessage?: string | null
          id?: string
          leaseId?: string | null
          metadata?: Json | null
          openedAt?: string | null
          recipientEmail?: string | null
          recipientName?: string | null
          reminderType?: string | null
          retryCount?: number | null
          sentAt?: string | null
          status?: string | null
          subject?: string | null
          subscriptionId?: string | null
          type?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_leaseId_fkey"
            columns: ["leaseId"]
            isOneToOne: false
            referencedRelation: "Lease"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actionUrl: string | null
          content: string
          createdAt: string
          id: string
          isRead: boolean
          leaseId: string | null
          maintenanceRequestId: string | null
          metadata: Json | null
          organizationId: string | null
          priority: string
          propertyId: string | null
          readAt: string | null
          tenantId: string | null
          title: string
          type: string
          updatedAt: string
          userId: string
        }
        Insert: {
          actionUrl?: string | null
          content: string
          createdAt?: string
          id?: string
          isRead?: boolean
          leaseId?: string | null
          maintenanceRequestId?: string | null
          metadata?: Json | null
          organizationId?: string | null
          priority?: string
          propertyId?: string | null
          readAt?: string | null
          tenantId?: string | null
          title: string
          type: string
          updatedAt?: string
          userId: string
        }
        Update: {
          actionUrl?: string | null
          content?: string
          createdAt?: string
          id?: string
          isRead?: boolean
          leaseId?: string | null
          maintenanceRequestId?: string | null
          metadata?: Json | null
          organizationId?: string | null
          priority?: string
          propertyId?: string | null
          readAt?: string | null
          tenantId?: string | null
          title?: string
          type?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_new_leaseId_fkey"
            columns: ["leaseId"]
            isOneToOne: false
            referencedRelation: "Lease"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_new_maintenanceRequestId_fkey"
            columns: ["maintenanceRequestId"]
            isOneToOne: false
            referencedRelation: "MaintenanceRequest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_new_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_new_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_new_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      PaymentAttempt: {
        Row: {
          attemptedAt: string
          attemptNumber: number
          failureCode: string | null
          failureMessage: string | null
          id: string
          organizationId: string
          rentPaymentId: string
          status: string
          stripePaymentIntentId: string
        }
        Insert: {
          attemptedAt?: string
          attemptNumber: number
          failureCode?: string | null
          failureMessage?: string | null
          id?: string
          organizationId: string
          rentPaymentId: string
          status: string
          stripePaymentIntentId: string
        }
        Update: {
          attemptedAt?: string
          attemptNumber?: number
          failureCode?: string | null
          failureMessage?: string | null
          id?: string
          organizationId?: string
          rentPaymentId?: string
          status?: string
          stripePaymentIntentId?: string
        }
        Relationships: [
          {
            foreignKeyName: "PaymentAttempt_rentPaymentId_fkey"
            columns: ["rentPaymentId"]
            isOneToOne: false
            referencedRelation: "RentPayments"
            referencedColumns: ["id"]
          },
        ]
      }
      PaymentFailure: {
        Row: {
          amount: number
          attemptCount: number
          createdAt: string
          currency: string
          errorCode: string | null
          errorMessage: string | null
          finalAttempt: boolean
          id: string
          nextRetryAt: string | null
          resolved: boolean
          resolvedAt: string | null
          stripeInvoiceId: string
          subscriptionId: string
          updatedAt: string
        }
        Insert: {
          amount: number
          attemptCount?: number
          createdAt?: string
          currency: string
          errorCode?: string | null
          errorMessage?: string | null
          finalAttempt?: boolean
          id?: string
          nextRetryAt?: string | null
          resolved?: boolean
          resolvedAt?: string | null
          stripeInvoiceId: string
          subscriptionId: string
          updatedAt?: string
        }
        Update: {
          amount?: number
          attemptCount?: number
          createdAt?: string
          currency?: string
          errorCode?: string | null
          errorMessage?: string | null
          finalAttempt?: boolean
          id?: string
          nextRetryAt?: string | null
          resolved?: boolean
          resolvedAt?: string | null
          stripeInvoiceId?: string
          subscriptionId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "PaymentFailure_subscriptionId_fkey"
            columns: ["subscriptionId"]
            isOneToOne: false
            referencedRelation: "Subscription"
            referencedColumns: ["id"]
          },
        ]
      }
      PaymentMethod: {
        Row: {
          active: boolean
          brand: string | null
          createdAt: string
          expiryMonth: number | null
          expiryYear: number | null
          fingerprint: string | null
          id: string
          isDefault: boolean
          lastFour: string | null
          organizationId: string
          stripePaymentMethodId: string
          tenantId: string
          type: string
          updatedAt: string
        }
        Insert: {
          active?: boolean
          brand?: string | null
          createdAt?: string
          expiryMonth?: number | null
          expiryYear?: number | null
          fingerprint?: string | null
          id?: string
          isDefault?: boolean
          lastFour?: string | null
          organizationId: string
          stripePaymentMethodId: string
          tenantId: string
          type: string
          updatedAt?: string
        }
        Update: {
          active?: boolean
          brand?: string | null
          createdAt?: string
          expiryMonth?: number | null
          expiryYear?: number | null
          fingerprint?: string | null
          id?: string
          isDefault?: boolean
          lastFour?: string | null
          organizationId?: string
          stripePaymentMethodId?: string
          tenantId?: string
          type?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "PaymentMethod_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_stripe_events: {
        Row: {
          event_type: string
          id: string
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          event_type: string
          id?: string
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          event_type?: string
          id?: string
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          email: string | null
          full_name: string | null
          id: string
          updatedAt: string | null
        }
        Insert: {
          company?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updatedAt?: string | null
        }
        Update: {
          company?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updatedAt?: string | null
        }
        Relationships: []
      }
      Property: {
        Row: {
          address: string
          city: string
          createdAt: string
          description: string | null
          id: string
          imageUrl: string | null
          name: string
          ownerId: string
          propertyType: Database["public"]["Enums"]["PropertyType"]
          state: string
          status: Database["public"]["Enums"]["PropertyStatus"]
          updatedAt: string
          zipCode: string
        }
        Insert: {
          address: string
          city: string
          createdAt?: string
          description?: string | null
          id?: string
          imageUrl?: string | null
          name: string
          ownerId: string
          propertyType?: Database["public"]["Enums"]["PropertyType"]
          state: string
          status?: Database["public"]["Enums"]["PropertyStatus"]
          updatedAt?: string
          zipCode: string
        }
        Update: {
          address?: string
          city?: string
          createdAt?: string
          description?: string | null
          id?: string
          imageUrl?: string | null
          name?: string
          ownerId?: string
          propertyType?: Database["public"]["Enums"]["PropertyType"]
          state?: string
          status?: Database["public"]["Enums"]["PropertyStatus"]
          updatedAt?: string
          zipCode?: string
        }
        Relationships: [
          {
            foreignKeyName: "Property_ownerId_fkey"
            columns: ["ownerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      RentCollectionSettings: {
        Row: {
          allowedPaymentMethods: string[] | null
          autoChargeEnabled: boolean
          createdAt: string
          dueDay: number
          gracePeriodDays: number
          id: string
          lateFeeAmount: number
          lateFeeType: Database["public"]["Enums"]["LateFeeType"]
          maxLateFeeAmount: number | null
          organizationId: string
          propertyId: string
          reminderDaysBefore: number[] | null
          sendLateNotices: boolean
          sendPaymentReminders: boolean
          sendReceiptEmails: boolean
          tenantId: string | null
          unitId: string | null
          updatedAt: string
        }
        Insert: {
          allowedPaymentMethods?: string[] | null
          autoChargeEnabled?: boolean
          createdAt?: string
          dueDay?: number
          gracePeriodDays?: number
          id?: string
          lateFeeAmount?: number
          lateFeeType?: Database["public"]["Enums"]["LateFeeType"]
          maxLateFeeAmount?: number | null
          organizationId: string
          propertyId: string
          reminderDaysBefore?: number[] | null
          sendLateNotices?: boolean
          sendPaymentReminders?: boolean
          sendReceiptEmails?: boolean
          tenantId?: string | null
          unitId?: string | null
          updatedAt?: string
        }
        Update: {
          allowedPaymentMethods?: string[] | null
          autoChargeEnabled?: boolean
          createdAt?: string
          dueDay?: number
          gracePeriodDays?: number
          id?: string
          lateFeeAmount?: number
          lateFeeType?: Database["public"]["Enums"]["LateFeeType"]
          maxLateFeeAmount?: number | null
          organizationId?: string
          propertyId?: string
          reminderDaysBefore?: number[] | null
          sendLateNotices?: boolean
          sendPaymentReminders?: boolean
          sendReceiptEmails?: boolean
          tenantId?: string | null
          unitId?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "RentCollectionSettings_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "RentCollectionSettings_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "RentCollectionSettings_unitId_fkey"
            columns: ["unitId"]
            isOneToOne: false
            referencedRelation: "Unit"
            referencedColumns: ["id"]
          },
        ]
      }
      RentDue: {
        Row: {
          amount: number
          createdAt: string
          currency: string
          description: string | null
          dueDate: string
          id: string
          lateFee: number | null
          lateFeeAppliedAt: string | null
          leaseId: string
          organizationId: string
          status: Database["public"]["Enums"]["RentChargeStatus"]
          tenantId: string
          unitId: string
          updatedAt: string
        }
        Insert: {
          amount: number
          createdAt?: string
          currency?: string
          description?: string | null
          dueDate: string
          id?: string
          lateFee?: number | null
          lateFeeAppliedAt?: string | null
          leaseId: string
          organizationId: string
          status?: Database["public"]["Enums"]["RentChargeStatus"]
          tenantId: string
          unitId: string
          updatedAt?: string
        }
        Update: {
          amount?: number
          createdAt?: string
          currency?: string
          description?: string | null
          dueDate?: string
          id?: string
          lateFee?: number | null
          lateFeeAppliedAt?: string | null
          leaseId?: string
          organizationId?: string
          status?: Database["public"]["Enums"]["RentChargeStatus"]
          tenantId?: string
          unitId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "RentCharge_leaseId_fkey"
            columns: ["leaseId"]
            isOneToOne: false
            referencedRelation: "Lease"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "RentCharge_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "RentCharge_unitId_fkey"
            columns: ["unitId"]
            isOneToOne: false
            referencedRelation: "Unit"
            referencedColumns: ["id"]
          },
        ]
      }
      RentPayments: {
        Row: {
          amount: number
          createdAt: string
          currency: string
          failureReason: string | null
          id: string
          netAmount: number
          organizationId: string
          paidAt: string | null
          paymentMethodId: string | null
          processingFee: number
          receiptUrl: string | null
          rentDueId: string
          status: Database["public"]["Enums"]["RentPaymentStatus"]
          stripeChargeId: string | null
          stripePaymentIntentId: string
          stripeReceiptUrl: string | null
          tenantId: string
          updatedAt: string
        }
        Insert: {
          amount: number
          createdAt?: string
          currency?: string
          failureReason?: string | null
          id?: string
          netAmount: number
          organizationId: string
          paidAt?: string | null
          paymentMethodId?: string | null
          processingFee?: number
          receiptUrl?: string | null
          rentDueId: string
          status?: Database["public"]["Enums"]["RentPaymentStatus"]
          stripeChargeId?: string | null
          stripePaymentIntentId: string
          stripeReceiptUrl?: string | null
          tenantId: string
          updatedAt?: string
        }
        Update: {
          amount?: number
          createdAt?: string
          currency?: string
          failureReason?: string | null
          id?: string
          netAmount?: number
          organizationId?: string
          paidAt?: string | null
          paymentMethodId?: string | null
          processingFee?: number
          receiptUrl?: string | null
          rentDueId?: string
          status?: Database["public"]["Enums"]["RentPaymentStatus"]
          stripeChargeId?: string | null
          stripePaymentIntentId?: string
          stripeReceiptUrl?: string | null
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "RentPayment_paymentMethodId_fkey"
            columns: ["paymentMethodId"]
            isOneToOne: false
            referencedRelation: "PaymentMethod"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "RentPayment_rentChargeId_fkey"
            columns: ["rentDueId"]
            isOneToOne: false
            referencedRelation: "RentDue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "RentPayment_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      SecurityAuditLog: {
        Row: {
          action: string | null
          details: Json
          email: string | null
          eventType: string
          id: string
          ipAddress: string | null
          resource: string | null
          severity: string
          timestamp: string
          userAgent: string | null
          userId: string | null
        }
        Insert: {
          action?: string | null
          details?: Json
          email?: string | null
          eventType: string
          id?: string
          ipAddress?: string | null
          resource?: string | null
          severity: string
          timestamp?: string
          userAgent?: string | null
          userId?: string | null
        }
        Update: {
          action?: string | null
          details?: Json
          email?: string | null
          eventType?: string
          id?: string
          ipAddress?: string | null
          resource?: string | null
          severity?: string
          timestamp?: string
          userAgent?: string | null
          userId?: string | null
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          balance: number | null
          createdAt: string | null
          currency: string | null
          delinquent: boolean | null
          description: string | null
          email: string | null
          id: string
          livemode: boolean | null
          metadata: Json | null
          name: string | null
          phone: string | null
          updatedAt: string | null
        }
        Insert: {
          balance?: number | null
          createdAt?: string | null
          currency?: string | null
          delinquent?: boolean | null
          description?: string | null
          email?: string | null
          id: string
          livemode?: boolean | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          updatedAt?: string | null
        }
        Update: {
          balance?: number | null
          createdAt?: string | null
          currency?: string | null
          delinquent?: boolean | null
          description?: string | null
          email?: string | null
          id?: string
          livemode?: boolean | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          updatedAt?: string | null
        }
        Relationships: []
      }
      stripe_payment_intents: {
        Row: {
          amount: number
          createdAt: string | null
          currency: string | null
          customer_id: string | null
          description: string | null
          id: string
          metadata: Json | null
          receipt_email: string | null
          status: string
          updatedAt: string | null
        }
        Insert: {
          amount: number
          createdAt?: string | null
          currency?: string | null
          customer_id?: string | null
          description?: string | null
          id: string
          metadata?: Json | null
          receipt_email?: string | null
          status: string
          updatedAt?: string | null
        }
        Update: {
          amount?: number
          createdAt?: string | null
          currency?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          receipt_email?: string | null
          status?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "stripe_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_prices: {
        Row: {
          active: boolean | null
          createdAt: string | null
          currency: string | null
          id: string
          metadata: Json | null
          product_id: string | null
          recurring_interval: string | null
          recurring_interval_count: number | null
          type: string | null
          unit_amount: number | null
          updatedAt: string | null
        }
        Insert: {
          active?: boolean | null
          createdAt?: string | null
          currency?: string | null
          id: string
          metadata?: Json | null
          product_id?: string | null
          recurring_interval?: string | null
          recurring_interval_count?: number | null
          type?: string | null
          unit_amount?: number | null
          updatedAt?: string | null
        }
        Update: {
          active?: boolean | null
          createdAt?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string | null
          recurring_interval?: string | null
          recurring_interval_count?: number | null
          type?: string | null
          unit_amount?: number | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stripe_products"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_products: {
        Row: {
          active: boolean | null
          createdAt: string | null
          description: string | null
          id: string
          images: string[] | null
          metadata: Json | null
          name: string
          unit_label: string | null
          updatedAt: string | null
        }
        Insert: {
          active?: boolean | null
          createdAt?: string | null
          description?: string | null
          id: string
          images?: string[] | null
          metadata?: Json | null
          name: string
          unit_label?: string | null
          updatedAt?: string | null
        }
        Update: {
          active?: boolean | null
          createdAt?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          metadata?: Json | null
          name?: string
          unit_label?: string | null
          updatedAt?: string | null
        }
        Relationships: []
      }
      stripe_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          createdAt: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string | null
          id: string
          metadata: Json | null
          status: string
          trial_end: string | null
          trial_start: string | null
          updatedAt: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          createdAt?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string | null
          id: string
          metadata?: Json | null
          status: string
          trial_end?: string | null
          trial_start?: string | null
          updatedAt?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          createdAt?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "stripe_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      Subscription: {
        Row: {
          billingPeriod: string | null
          cancelAtPeriodEnd: boolean | null
          canceledAt: string | null
          cancelledAt: string | null
          createdAt: string
          currentPeriodEnd: string | null
          currentPeriodStart: string | null
          endDate: string | null
          id: string
          planId: string | null
          planType: Database["public"]["Enums"]["PlanType"] | null
          startDate: string
          status: Database["public"]["Enums"]["SubStatus"]
          stripeCustomerId: string | null
          stripePriceId: string | null
          stripeSubscriptionId: string | null
          trialEnd: string | null
          trialStart: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          billingPeriod?: string | null
          cancelAtPeriodEnd?: boolean | null
          canceledAt?: string | null
          cancelledAt?: string | null
          createdAt?: string
          currentPeriodEnd?: string | null
          currentPeriodStart?: string | null
          endDate?: string | null
          id?: string
          planId?: string | null
          planType?: Database["public"]["Enums"]["PlanType"] | null
          startDate?: string
          status: Database["public"]["Enums"]["SubStatus"]
          stripeCustomerId?: string | null
          stripePriceId?: string | null
          stripeSubscriptionId?: string | null
          trialEnd?: string | null
          trialStart?: string | null
          updatedAt?: string
          userId: string
        }
        Update: {
          billingPeriod?: string | null
          cancelAtPeriodEnd?: boolean | null
          canceledAt?: string | null
          cancelledAt?: string | null
          createdAt?: string
          currentPeriodEnd?: string | null
          currentPeriodStart?: string | null
          endDate?: string | null
          id?: string
          planId?: string | null
          planType?: Database["public"]["Enums"]["PlanType"] | null
          startDate?: string
          status?: Database["public"]["Enums"]["SubStatus"]
          stripeCustomerId?: string | null
          stripePriceId?: string | null
          stripeSubscriptionId?: string | null
          trialEnd?: string | null
          trialStart?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Subscription_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Tenant: {
        Row: {
          avatarUrl: string | null
          createdAt: string
          email: string
          emergencyContact: string | null
          firstName: string | null
          id: string
          lastName: string | null
          name: string | null
          phone: string | null
          updatedAt: string
          userId: string | null
        }
        Insert: {
          avatarUrl?: string | null
          createdAt?: string
          email: string
          emergencyContact?: string | null
          firstName?: string | null
          id?: string
          lastName?: string | null
          name?: string | null
          phone?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Update: {
          avatarUrl?: string | null
          createdAt?: string
          email?: string
          emergencyContact?: string | null
          firstName?: string | null
          id?: string
          lastName?: string | null
          name?: string | null
          phone?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Tenant_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Unit: {
        Row: {
          bathrooms: number
          bedrooms: number
          createdAt: string
          id: string
          lastInspectionDate: string | null
          propertyId: string
          rent: number
          squareFeet: number | null
          status: Database["public"]["Enums"]["UnitStatus"]
          unitNumber: string
          updatedAt: string
        }
        Insert: {
          bathrooms?: number
          bedrooms?: number
          createdAt?: string
          id?: string
          lastInspectionDate?: string | null
          propertyId: string
          rent: number
          squareFeet?: number | null
          status?: Database["public"]["Enums"]["UnitStatus"]
          unitNumber: string
          updatedAt?: string
        }
        Update: {
          bathrooms?: number
          bedrooms?: number
          createdAt?: string
          id?: string
          lastInspectionDate?: string | null
          propertyId?: string
          rent?: number
          squareFeet?: number | null
          status?: Database["public"]["Enums"]["UnitStatus"]
          unitNumber?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Unit_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          avatarUrl: string | null
          bio: string | null
          createdAt: string
          email: string
          firstName: string | null
          id: string
          lastLoginAt: string | null
          lastName: string | null
          name: string | null
          orgId: string | null
          phone: string | null
          profileComplete: boolean | null
          role: Database["public"]["Enums"]["UserRole"]
          stripeCustomerId: string | null
          supabaseId: string
          updatedAt: string
        }
        Insert: {
          avatarUrl?: string | null
          bio?: string | null
          createdAt?: string
          email: string
          firstName?: string | null
          id: string
          lastLoginAt?: string | null
          lastName?: string | null
          name?: string | null
          orgId?: string | null
          phone?: string | null
          profileComplete?: boolean | null
          role?: Database["public"]["Enums"]["UserRole"]
          stripeCustomerId?: string | null
          supabaseId: string
          updatedAt?: string
        }
        Update: {
          avatarUrl?: string | null
          bio?: string | null
          createdAt?: string
          email?: string
          firstName?: string | null
          id?: string
          lastLoginAt?: string | null
          lastName?: string | null
          name?: string | null
          orgId?: string | null
          phone?: string | null
          profileComplete?: boolean | null
          role?: Database["public"]["Enums"]["UserRole"]
          stripeCustomerId?: string | null
          supabaseId?: string
          updatedAt?: string
        }
        Relationships: []
      }
      UserAccessLog: {
        Row: {
          accessGranted: Json
          id: string
          planType: string
          reason: string
          subscriptionStatus: string
          timestamp: string
          userId: string
        }
        Insert: {
          accessGranted: Json
          id?: string
          planType: string
          reason: string
          subscriptionStatus: string
          timestamp?: string
          userId: string
        }
        Update: {
          accessGranted?: Json
          id?: string
          planType?: string
          reason?: string
          subscriptionStatus?: string
          timestamp?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserAccessLog_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      UserFeatureAccess: {
        Row: {
          canAccessAdvancedAnalytics: boolean
          canAccessAPI: boolean
          canExportData: boolean
          canInviteTeamMembers: boolean
          canUseBulkOperations: boolean
          canUsePremiumIntegrations: boolean
          createdAt: string
          hasPrioritySupport: boolean
          id: string
          maxProperties: number
          maxStorageGB: number
          maxUnitsPerProperty: number
          updatedAt: string
          updateReason: string | null
          userId: string
        }
        Insert: {
          canAccessAdvancedAnalytics?: boolean
          canAccessAPI?: boolean
          canExportData?: boolean
          canInviteTeamMembers?: boolean
          canUseBulkOperations?: boolean
          canUsePremiumIntegrations?: boolean
          createdAt?: string
          hasPrioritySupport?: boolean
          id?: string
          maxProperties?: number
          maxStorageGB?: number
          maxUnitsPerProperty?: number
          updatedAt?: string
          updateReason?: string | null
          userId: string
        }
        Update: {
          canAccessAdvancedAnalytics?: boolean
          canAccessAPI?: boolean
          canExportData?: boolean
          canInviteTeamMembers?: boolean
          canUseBulkOperations?: boolean
          canUsePremiumIntegrations?: boolean
          createdAt?: string
          hasPrioritySupport?: boolean
          id?: string
          maxProperties?: number
          maxStorageGB?: number
          maxUnitsPerProperty?: number
          updatedAt?: string
          updateReason?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserFeatureAccess_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      UserPreferences: {
        Row: {
          autoSendReminders: boolean
          createdAt: string
          daysBeforeDue: number
          defaultDashboardView: string
          emailNotifications: boolean
          enableOverdueReminders: boolean
          enableReminders: boolean
          id: string
          overdueGracePeriod: number
          pushNotifications: boolean
          showWelcomeMessage: boolean
          smsNotifications: boolean
          updatedAt: string
          userId: string
        }
        Insert: {
          autoSendReminders?: boolean
          createdAt?: string
          daysBeforeDue?: number
          defaultDashboardView?: string
          emailNotifications?: boolean
          enableOverdueReminders?: boolean
          enableReminders?: boolean
          id?: string
          overdueGracePeriod?: number
          pushNotifications?: boolean
          showWelcomeMessage?: boolean
          smsNotifications?: boolean
          updatedAt?: string
          userId: string
        }
        Update: {
          autoSendReminders?: boolean
          createdAt?: string
          daysBeforeDue?: number
          defaultDashboardView?: string
          emailNotifications?: boolean
          enableOverdueReminders?: boolean
          enableReminders?: boolean
          id?: string
          overdueGracePeriod?: number
          pushNotifications?: boolean
          showWelcomeMessage?: boolean
          smsNotifications?: boolean
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserPreferences_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      UserSession: {
        Row: {
          createdAt: string
          expiresAt: string
          id: string
          invalidatedAt: string | null
          ipAddress: string | null
          isActive: boolean
          lastActivity: string
          refreshTokenId: string
          updatedAt: string
          userAgent: string | null
          userId: string
        }
        Insert: {
          createdAt?: string
          expiresAt: string
          id?: string
          invalidatedAt?: string | null
          ipAddress?: string | null
          isActive?: boolean
          lastActivity?: string
          refreshTokenId: string
          updatedAt?: string
          userAgent?: string | null
          userId: string
        }
        Update: {
          createdAt?: string
          expiresAt?: string
          id?: string
          invalidatedAt?: string | null
          ipAddress?: string | null
          isActive?: boolean
          lastActivity?: string
          refreshTokenId?: string
          updatedAt?: string
          userAgent?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserSession_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      WebhookEvent: {
        Row: {
          createdAt: string
          errorMessage: string | null
          eventType: string
          id: string
          processed: boolean
          processingTime: number | null
          retryCount: number
          stripeEventId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          errorMessage?: string | null
          eventType: string
          id?: string
          processed?: boolean
          processingTime?: number | null
          retryCount?: number
          stripeEventId: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          errorMessage?: string | null
          eventType?: string
          id?: string
          processed?: boolean
          processingTime?: number | null
          retryCount?: number
          stripeEventId?: string
          updatedAt?: string
        }
        Relationships: []
      }
      wrappers_fdw_stats: {
        Row: {
          bytes_in: number | null
          bytes_out: number | null
          create_times: number | null
          created_at: string
          fdw_name: string
          metadata: Json | null
          rows_in: number | null
          rows_out: number | null
          updated_at: string
        }
        Insert: {
          bytes_in?: number | null
          bytes_out?: number | null
          create_times?: number | null
          created_at?: string
          fdw_name: string
          metadata?: Json | null
          rows_in?: number | null
          rows_out?: number | null
          updated_at?: string
        }
        Update: {
          bytes_in?: number | null
          bytes_out?: number | null
          create_times?: number | null
          created_at?: string
          fdw_name?: string
          metadata?: Json | null
          rows_in?: number | null
          rows_out?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_get_user_by_email: {
        Args: { p_email: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          email: string
          email_verified: boolean
          id: string
          last_login_at: string
          name: string
          organization_id: string
          phone: string
          profile_complete: boolean
          role: string
          stripe_customer_id: string
          supabase_id: string
          updated_at: string
        }[]
      }
      auth_get_user_by_supabase_id: {
        Args: { p_supabase_id: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          email: string
          email_verified: boolean
          id: string
          last_login_at: string
          name: string
          organization_id: string
          phone: string
          profile_complete: boolean
          role: string
          stripe_customer_id: string
          supabase_id: string
          updated_at: string
        }[]
      }
      auth_get_user_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_users_last_30_days: number
          admins_count: number
          managers_count: number
          owners_count: number
          tenants_count: number
          total_users: number
          verified_users: number
        }[]
      }
      auth_sync_user_with_database: {
        Args:
          | {
              p_avatar_url?: string
              p_email: string
              p_name?: string
              p_phone?: string
              p_supabase_id: string
            }
          | { p_email: string; p_supabase_id: string }
        Returns: Json
      }
      auth_update_user_profile: {
        Args: {
          p_avatar_url?: string
          p_bio?: string
          p_name?: string
          p_phone?: string
          p_user_id: string
        }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          email: string
          email_verified: boolean
          id: string
          last_login_at: string
          name: string
          organization_id: string
          phone: string
          profile_complete: boolean
          role: string
          stripe_customer_id: string
          supabase_id: string
          updated_at: string
        }[]
      }
      auth_user_has_role: {
        Args: { p_required_role: string; p_supabase_id: string }
        Returns: boolean
      }
      auth_validate_token_and_get_user: {
        Args: { p_token: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          email: string
          email_verified: boolean
          id: string
          last_login_at: string
          name: string
          organization_id: string
          phone: string
          profile_complete: boolean
          role: string
          stripe_customer_id: string
          supabase_id: string
          updated_at: string
        }[]
      }
      calculate_financial_metrics: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: Json
      }
      calculate_maintenance_metrics: {
        Args: {
          p_end_date?: string
          p_property_id?: string
          p_start_date?: string
          p_user_id: string
        }
        Returns: Json
      }
      calculate_monthly_metrics: {
        Args: { p_user_id: string; p_year?: number }
        Returns: Json
      }
      calculate_net_operating_income: {
        Args: { p_period?: string; p_user_id: string }
        Returns: Json
      }
      calculate_property_performance: {
        Args: { p_period?: string; p_property_id: string; p_user_id: string }
        Returns: Json
      }
      calculate_visitor_analytics_full: {
        Args: {
          p_property_id?: string
          p_time_range?: string
          p_user_id: string
        }
        Returns: Json
      }
      execute_stripe_fdw_query: {
        Args: { sql_query: string }
        Returns: Json
      }
      get_billing_insights: {
        Args: { end_date?: string; start_date?: string; user_id: string }
        Returns: Json
      }
      get_dashboard_metrics: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_dashboard_stats: {
        Args: { user_id_param: string } | { user_id_param: string }
        Returns: Json
      }
      get_dashboard_summary: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_entity_permissions: {
        Args: { p_entity_id: string; p_entity_type: string; p_user_id: string }
        Returns: Json
      }
      get_expense_summary: {
        Args: { p_user_id: string; p_year?: number }
        Returns: Json
      }
      get_financial_overview: {
        Args: { p_user_id: string; p_year?: number }
        Returns: Json
      }
      get_invoice_statistics: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_lease_financial_summary: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_maintenance_analytics: {
        Args: { user_id: string }
        Returns: Json
      }
      get_property_performance: {
        Args: { p_user_id: string } | { p_user_id: string }
        Returns: Json
      }
      get_property_units: {
        Args: { p_property_id: string; p_user_id: string }
        Returns: Json
      }
      get_stripe_customers: {
        Args: { limit_count?: number }
        Returns: {
          balance: number
          created_at: string
          currency: string
          delinquent: boolean
          description: string
          email: string
          id: string
          livemode: boolean
          metadata: Json
          name: string
          phone: string
        }[]
      }
      get_stripe_prices: {
        Args: {
          active_only?: boolean
          limit_count?: number
          product_id?: string
        }
        Returns: {
          active: boolean
          billing_scheme: string
          created_at: string
          currency: string
          id: string
          livemode: boolean
          metadata: Json
          product_id: string
          recurring: Json
          type: string
          unit_amount: number
        }[]
      }
      get_stripe_products: {
        Args: { active_only?: boolean; limit_count?: number }
        Returns: {
          active: boolean
          created_at: string
          description: string
          id: string
          livemode: boolean
          metadata: Json
          name: string
          type: string
          updated_at: string
        }[]
      }
      get_unit_statistics: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_unread_notification_count: {
        Args: { user_id: string }
        Returns: number
      }
      health_check: {
        Args: Record<PropertyKey, never>
        Returns: {
          at: string
          ok: boolean
        }[]
      }
      health_check_analytics: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mark_all_notifications_read: {
        Args: { user_id: string }
        Returns: number
      }
      renew_lease: {
        Args: { p_lease_id: string; p_new_end_date: string; p_user_id: string }
        Returns: Json
      }
      search_by_name: {
        Args: { search_term: string; table_name: string }
        Returns: {
          firstName: string
          id: string
          lastName: string
          name: string
        }[]
      }
      send_tenant_invitation: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: Json
      }
      terminate_lease: {
        Args: { p_lease_id: string; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      validate_password_strength: {
        Args: { p_password: string }
        Returns: Json
      }
      verify_security_compliance: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      verify_stripe_webhook: {
        Args: { p_payload: string; p_signature: string }
        Returns: Json
      }
    }
    Enums: {
      ActivityEntityType:
        | "property"
        | "tenant"
        | "maintenance"
        | "payment"
        | "lease"
        | "unit"
      BlogCategory:
        | "PROPERTY_MANAGEMENT"
        | "LEGAL_COMPLIANCE"
        | "FINANCIAL_MANAGEMENT"
        | "PROPERTY_MAINTENANCE"
        | "SOFTWARE_REVIEWS"
        | "TENANT_RELATIONS"
        | "MARKETING"
        | "REAL_ESTATE_INVESTMENT"
        | "TAX_PLANNING"
        | "AUTOMATION"
      BlogStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "SCHEDULED"
      CustomerInvoiceStatus:
        | "DRAFT"
        | "SENT"
        | "VIEWED"
        | "PAID"
        | "OVERDUE"
        | "CANCELLED"
      DocumentType:
        | "LEASE"
        | "INVOICE"
        | "RECEIPT"
        | "PROPERTY_PHOTO"
        | "INSPECTION"
        | "MAINTENANCE"
        | "OTHER"
      LateFeeType: "FIXED" | "PERCENTAGE"
      LeaseStatus: "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED"
      LeaseType: "FIXED_TERM" | "MONTH_TO_MONTH" | "WEEK_TO_WEEK"
      MaintenanceCategory:
        | "GENERAL"
        | "PLUMBING"
        | "ELECTRICAL"
        | "HVAC"
        | "APPLIANCES"
        | "SAFETY"
        | "OTHER"
      PlanType: "FREETRIAL" | "STARTER" | "GROWTH" | "TENANTFLOW_MAX"
      Priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY"
      PropertyStatus: "ACTIVE" | "INACTIVE" | "UNDER_CONTRACT" | "SOLD"
      PropertyType:
        | "SINGLE_FAMILY"
        | "MULTI_UNIT"
        | "APARTMENT"
        | "COMMERCIAL"
        | "CONDO"
        | "TOWNHOUSE"
        | "OTHER"
      ReminderStatus: "PENDING" | "SENT" | "FAILED" | "DELIVERED" | "OPENED"
      ReminderType:
        | "RENT_REMINDER"
        | "LEASE_EXPIRATION"
        | "MAINTENANCE_DUE"
        | "PAYMENT_OVERDUE"
      RentChargeStatus: "PENDING" | "PAID" | "PARTIAL" | "OVERDUE" | "CANCELLED"
      RentPaymentStatus:
        | "PENDING"
        | "SUCCEEDED"
        | "FAILED"
        | "CANCELLED"
        | "REQUIRES_ACTION"
      RequestStatus:
        | "OPEN"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELED"
        | "ON_HOLD"
      SubStatus:
        | "ACTIVE"
        | "TRIALING"
        | "PAST_DUE"
        | "CANCELED"
        | "UNPAID"
        | "INCOMPLETE"
        | "INCOMPLETE_EXPIRED"
      TenantStatus: "ACTIVE" | "INACTIVE" | "EVICTED" | "PENDING"
      UnitStatus: "VACANT" | "OCCUPIED" | "MAINTENANCE" | "RESERVED"
      UserRole: "OWNER" | "MANAGER" | "TENANT" | "ADMIN"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ActivityEntityType: [
        "property",
        "tenant",
        "maintenance",
        "payment",
        "lease",
        "unit",
      ],
      BlogCategory: [
        "PROPERTY_MANAGEMENT",
        "LEGAL_COMPLIANCE",
        "FINANCIAL_MANAGEMENT",
        "PROPERTY_MAINTENANCE",
        "SOFTWARE_REVIEWS",
        "TENANT_RELATIONS",
        "MARKETING",
        "REAL_ESTATE_INVESTMENT",
        "TAX_PLANNING",
        "AUTOMATION",
      ],
      BlogStatus: ["DRAFT", "PUBLISHED", "ARCHIVED", "SCHEDULED"],
      CustomerInvoiceStatus: [
        "DRAFT",
        "SENT",
        "VIEWED",
        "PAID",
        "OVERDUE",
        "CANCELLED",
      ],
      DocumentType: [
        "LEASE",
        "INVOICE",
        "RECEIPT",
        "PROPERTY_PHOTO",
        "INSPECTION",
        "MAINTENANCE",
        "OTHER",
      ],
      LateFeeType: ["FIXED", "PERCENTAGE"],
      LeaseStatus: ["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"],
      LeaseType: ["FIXED_TERM", "MONTH_TO_MONTH", "WEEK_TO_WEEK"],
      MaintenanceCategory: [
        "GENERAL",
        "PLUMBING",
        "ELECTRICAL",
        "HVAC",
        "APPLIANCES",
        "SAFETY",
        "OTHER",
      ],
      PlanType: ["FREETRIAL", "STARTER", "GROWTH", "TENANTFLOW_MAX"],
      Priority: ["LOW", "MEDIUM", "HIGH", "EMERGENCY"],
      PropertyStatus: ["ACTIVE", "INACTIVE", "UNDER_CONTRACT", "SOLD"],
      PropertyType: [
        "SINGLE_FAMILY",
        "MULTI_UNIT",
        "APARTMENT",
        "COMMERCIAL",
        "CONDO",
        "TOWNHOUSE",
        "OTHER",
      ],
      ReminderStatus: ["PENDING", "SENT", "FAILED", "DELIVERED", "OPENED"],
      ReminderType: [
        "RENT_REMINDER",
        "LEASE_EXPIRATION",
        "MAINTENANCE_DUE",
        "PAYMENT_OVERDUE",
      ],
      RentChargeStatus: ["PENDING", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"],
      RentPaymentStatus: [
        "PENDING",
        "SUCCEEDED",
        "FAILED",
        "CANCELLED",
        "REQUIRES_ACTION",
      ],
      RequestStatus: [
        "OPEN",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELED",
        "ON_HOLD",
      ],
      SubStatus: [
        "ACTIVE",
        "TRIALING",
        "PAST_DUE",
        "CANCELED",
        "UNPAID",
        "INCOMPLETE",
        "INCOMPLETE_EXPIRED",
      ],
      TenantStatus: ["ACTIVE", "INACTIVE", "EVICTED", "PENDING"],
      UnitStatus: ["VACANT", "OCCUPIED", "MAINTENANCE", "RESERVED"],
      UserRole: ["OWNER", "MANAGER", "TENANT", "ADMIN"],
    },
  },
} as const
