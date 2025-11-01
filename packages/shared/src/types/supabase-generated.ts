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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      _blog_article_to_blog_tag: {
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
            foreignKeyName: "_blogarticletoblogtag_a_fkey"
            columns: ["A"]
            isOneToOne: false
            referencedRelation: "blog_article"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "_blogarticletoblogtag_b_fkey"
            columns: ["B"]
            isOneToOne: false
            referencedRelation: "blog_tag"
            referencedColumns: ["id"]
          },
        ]
      }
      activity: {
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
            foreignKeyName: "activity_userid_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_webhook_log: {
        Row: {
          created_at: string | null
          error: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_article: {
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
            foreignKeyName: "blogarticle_authorid_fkey"
            columns: ["authorId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tag: {
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
      connected_account: {
        Row: {
          accountStatus: string | null
          accountType: string
          businessType: string | null
          capabilities: Json | null
          chargesEnabled: boolean | null
          contactEmail: string | null
          country: string | null
          createdAt: string | null
          currency: string | null
          detailsSubmitted: boolean | null
          displayName: string | null
          id: string
          onboardingCompleted: boolean | null
          onboardingCompletedAt: string | null
          payoutsEnabled: boolean | null
          requirements: Json | null
          stripeAccountId: string
          updatedAt: string | null
          userId: string
        }
        Insert: {
          accountStatus?: string | null
          accountType?: string
          businessType?: string | null
          capabilities?: Json | null
          chargesEnabled?: boolean | null
          contactEmail?: string | null
          country?: string | null
          createdAt?: string | null
          currency?: string | null
          detailsSubmitted?: boolean | null
          displayName?: string | null
          id?: string
          onboardingCompleted?: boolean | null
          onboardingCompletedAt?: string | null
          payoutsEnabled?: boolean | null
          requirements?: Json | null
          stripeAccountId: string
          updatedAt?: string | null
          userId: string
        }
        Update: {
          accountStatus?: string | null
          accountType?: string
          businessType?: string | null
          capabilities?: Json | null
          chargesEnabled?: boolean | null
          contactEmail?: string | null
          country?: string | null
          createdAt?: string | null
          currency?: string | null
          detailsSubmitted?: boolean | null
          displayName?: string | null
          id?: string
          onboardingCompleted?: boolean | null
          onboardingCompletedAt?: string | null
          payoutsEnabled?: boolean | null
          requirements?: Json | null
          stripeAccountId?: string
          updatedAt?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "connectedaccount_userid_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invoice: {
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
          status: Database["public"]["Enums"]["customer_invoice_status"]
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
          status?: Database["public"]["Enums"]["customer_invoice_status"]
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
          status?: Database["public"]["Enums"]["customer_invoice_status"]
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
      customer_invoice_item: {
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
            foreignKeyName: "customerinvoiceitem_invoiceid_fkey"
            columns: ["invoiceId"]
            isOneToOne: false
            referencedRelation: "customer_invoice"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_stats_history: {
        Row: {
          active_leases: number
          active_tenants: number
          avg_resolution_time_hours: number
          completed_maintenance: number
          daily_revenue: number
          expired_leases: number
          expiring_soon_leases: number
          id: string
          in_progress_maintenance: number
          inactive_tenants: number
          maintenance_units: number
          monthly_revenue: number
          occupancy_rate: number
          occupied_properties: number
          occupied_units: number
          open_maintenance: number
          snapshot_date: string
          snapshot_timestamp: string
          total_actual_rent: number
          total_lease_rent: number
          total_leases: number
          total_maintenance: number
          total_potential_rent: number
          total_properties: number
          total_tenants: number
          total_units: number
          user_id: string
          vacant_units: number
          yearly_revenue: number
        }
        Insert: {
          active_leases?: number
          active_tenants?: number
          avg_resolution_time_hours?: number
          completed_maintenance?: number
          daily_revenue?: number
          expired_leases?: number
          expiring_soon_leases?: number
          id?: string
          in_progress_maintenance?: number
          inactive_tenants?: number
          maintenance_units?: number
          monthly_revenue?: number
          occupancy_rate?: number
          occupied_properties?: number
          occupied_units?: number
          open_maintenance?: number
          snapshot_date?: string
          snapshot_timestamp?: string
          total_actual_rent?: number
          total_lease_rent?: number
          total_leases?: number
          total_maintenance?: number
          total_potential_rent?: number
          total_properties?: number
          total_tenants?: number
          total_units?: number
          user_id: string
          vacant_units?: number
          yearly_revenue?: number
        }
        Update: {
          active_leases?: number
          active_tenants?: number
          avg_resolution_time_hours?: number
          completed_maintenance?: number
          daily_revenue?: number
          expired_leases?: number
          expiring_soon_leases?: number
          id?: string
          in_progress_maintenance?: number
          inactive_tenants?: number
          maintenance_units?: number
          monthly_revenue?: number
          occupancy_rate?: number
          occupied_properties?: number
          occupied_units?: number
          open_maintenance?: number
          snapshot_date?: string
          snapshot_timestamp?: string
          total_actual_rent?: number
          total_lease_rent?: number
          total_leases?: number
          total_maintenance?: number
          total_potential_rent?: number
          total_properties?: number
          total_tenants?: number
          total_units?: number
          user_id?: string
          vacant_units?: number
          yearly_revenue?: number
        }
        Relationships: []
      }
      document: {
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
            foreignKeyName: "document_leaseid_fkey"
            columns: ["leaseId"]
            isOneToOne: false
            referencedRelation: "lease"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_propertyid_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          compressed_size: number
          compression_ratio: number | null
          created_at: string | null
          document_type: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          id: string
          mime_type: string
          original_size: number
          retention_until: string
          soft_deleted_at: string | null
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
          version: number
        }
        Insert: {
          compressed_size: number
          compression_ratio?: number | null
          created_at?: string | null
          document_type: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          id?: string
          mime_type: string
          original_size: number
          retention_until: string
          soft_deleted_at?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
          version?: number
        }
        Update: {
          compressed_size?: number
          compression_ratio?: number | null
          created_at?: string | null
          document_type?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string
          original_size?: number
          retention_until?: string
          soft_deleted_at?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          email_type: string
          failed_at: string | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          next_retry_at: string
          payload: Json
          priority: string
          recipient_email: string
          status: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          email_type: string
          failed_at?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          next_retry_at: string
          payload: Json
          priority?: string
          recipient_email: string
          status?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          email_type?: string
          failed_at?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          next_retry_at?: string
          payload?: Json
          priority?: string
          recipient_email?: string
          status?: string
        }
        Relationships: []
      }
      expense: {
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
            foreignKeyName: "expense_maintenanceid_fkey"
            columns: ["maintenanceId"]
            isOneToOne: false
            referencedRelation: "maintenance_request"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_propertyid_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_webhook_event: {
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
      file: {
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
            foreignKeyName: "file_maintenancerequestid_fkey"
            columns: ["maintenanceRequestId"]
            isOneToOne: false
            referencedRelation: "maintenance_request"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_propertyid_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_uploadedbyid_fkey"
            columns: ["uploadedById"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      form_drafts: {
        Row: {
          created_at: string
          draft_data: Json
          expires_at: string
          form_type: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_data?: Json
          expires_at: string
          form_type: string
          id?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_data?: Json
          expires_at?: string
          form_type?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      generated_report: {
        Row: {
          createdAt: string
          endDate: string
          errorMessage: string | null
          filePath: string | null
          fileSize: number | null
          fileUrl: string | null
          format: string
          id: string
          metadata: Json | null
          reportName: string
          reportType: string
          startDate: string
          status: string
          updatedAt: string
          userId: string
        }
        Insert: {
          createdAt?: string
          endDate: string
          errorMessage?: string | null
          filePath?: string | null
          fileSize?: number | null
          fileUrl?: string | null
          format: string
          id?: string
          metadata?: Json | null
          reportName: string
          reportType: string
          startDate: string
          status?: string
          updatedAt?: string
          userId: string
        }
        Update: {
          createdAt?: string
          endDate?: string
          errorMessage?: string | null
          filePath?: string | null
          fileSize?: number | null
          fileUrl?: string | null
          format?: string
          id?: string
          metadata?: Json | null
          reportName?: string
          reportType?: string
          startDate?: string
          status?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: []
      }
      inspection: {
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
            foreignKeyName: "inspection_inspectorid_fkey"
            columns: ["inspectorId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_propertyid_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_unitid_fkey"
            columns: ["unitId"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice: {
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
            foreignKeyName: "invoice_subscriptionid_fkey"
            columns: ["subscriptionId"]
            isOneToOne: false
            referencedRelation: "subscription"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_userid_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lead_capture: {
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
      lease: {
        Row: {
          createdAt: string
          endDate: string
          gracePeriodDays: number | null
          id: string
          lateFeeAmount: number | null
          lateFeePercentage: number | null
          lease_document_url: string | null
          monthlyRent: number | null
          propertyId: string | null
          rentAmount: number
          securityDeposit: number
          signature: string | null
          signed_at: string | null
          startDate: string
          status: Database["public"]["Enums"]["LeaseStatus"]
          stripe_subscription_id: string | null
          tenantId: string
          terms: string | null
          unitId: string | null
          updatedAt: string
          version: number
        }
        Insert: {
          createdAt?: string
          endDate: string
          gracePeriodDays?: number | null
          id?: string
          lateFeeAmount?: number | null
          lateFeePercentage?: number | null
          lease_document_url?: string | null
          monthlyRent?: number | null
          propertyId?: string | null
          rentAmount: number
          securityDeposit: number
          signature?: string | null
          signed_at?: string | null
          startDate: string
          status?: Database["public"]["Enums"]["LeaseStatus"]
          stripe_subscription_id?: string | null
          tenantId: string
          terms?: string | null
          unitId?: string | null
          updatedAt?: string
          version?: number
        }
        Update: {
          createdAt?: string
          endDate?: string
          gracePeriodDays?: number | null
          id?: string
          lateFeeAmount?: number | null
          lateFeePercentage?: number | null
          lease_document_url?: string | null
          monthlyRent?: number | null
          propertyId?: string | null
          rentAmount?: number
          securityDeposit?: number
          signature?: string | null
          signed_at?: string | null
          startDate?: string
          status?: Database["public"]["Enums"]["LeaseStatus"]
          stripe_subscription_id?: string | null
          tenantId?: string
          terms?: string | null
          unitId?: string | null
          updatedAt?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "lease_propertyid_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_tenantid_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_unitid_fkey"
            columns: ["unitId"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_generator_usage: {
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
            foreignKeyName: "leasegeneratorusage_userid_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_request: {
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
          version: number
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
          version?: number
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
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "maintenancerequest_unitid_fkey"
            columns: ["unitId"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      message: {
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
            foreignKeyName: "message_receiverid_fkey"
            columns: ["receiverId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_senderid_fkey"
            columns: ["senderId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
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
            foreignKeyName: "notification_logs_leaseid_fkey"
            columns: ["leaseId"]
            isOneToOne: false
            referencedRelation: "lease"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_userid_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
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
          version: number
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
          version?: number
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
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "notifications_new_leaseid_fkey"
            columns: ["leaseId"]
            isOneToOne: false
            referencedRelation: "lease"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_new_maintenancerequestid_fkey"
            columns: ["maintenanceRequestId"]
            isOneToOne: false
            referencedRelation: "maintenance_request"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_new_propertyid_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_new_tenantid_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_new_userid_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      password_failed_verification_attempts: {
        Row: {
          last_failed_at: string
          user_id: string
        }
        Insert: {
          last_failed_at: string
          user_id: string
        }
        Update: {
          last_failed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_attempt: {
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
            foreignKeyName: "paymentattempt_rentpaymentid_fkey"
            columns: ["rentPaymentId"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_failure: {
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
            foreignKeyName: "paymentfailure_subscriptionid_fkey"
            columns: ["subscriptionId"]
            isOneToOne: false
            referencedRelation: "subscription"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method: {
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
            foreignKeyName: "paymentmethod_tenantid_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedule: {
        Row: {
          amount: number
          createdAt: string | null
          dueDate: string
          id: string
          lateFeeAmount: number | null
          lateFeeGraceDays: number | null
          leaseId: string
          paidAt: string | null
          state: string
          status: string | null
          version: number
        }
        Insert: {
          amount: number
          createdAt?: string | null
          dueDate: string
          id?: string
          lateFeeAmount?: number | null
          lateFeeGraceDays?: number | null
          leaseId: string
          paidAt?: string | null
          state: string
          status?: string | null
          version?: number
        }
        Update: {
          amount?: number
          createdAt?: string | null
          dueDate?: string
          id?: string
          lateFeeAmount?: number | null
          lateFeeGraceDays?: number | null
          leaseId?: string
          paidAt?: string | null
          state?: string
          status?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "paymentschedule_leaseid_fkey"
            columns: ["leaseId"]
            isOneToOne: false
            referencedRelation: "lease"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_stripe_events: {
        Row: {
          event_type: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          last_retry_at: string | null
          processed_at: string | null
          retry_count: number | null
          status: string | null
          stripe_event_id: string
        }
        Insert: {
          event_type: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          last_retry_at?: string | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string | null
          stripe_event_id: string
        }
        Update: {
          event_type?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          last_retry_at?: string | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string | null
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
          version: number
        }
        Insert: {
          company?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updatedAt?: string | null
          version?: number
        }
        Update: {
          company?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updatedAt?: string | null
          version?: number
        }
        Relationships: []
      }
      property: {
        Row: {
          address: string
          city: string
          createdAt: string
          date_sold: string | null
          description: string | null
          id: string
          imageUrl: string | null
          name: string
          ownerId: string
          propertyType: Database["public"]["Enums"]["PropertyType"]
          sale_notes: string | null
          sale_price: number | null
          state: string
          status: Database["public"]["Enums"]["PropertyStatus"]
          updatedAt: string
          version: number
          zipCode: string
        }
        Insert: {
          address: string
          city: string
          createdAt?: string
          date_sold?: string | null
          description?: string | null
          id?: string
          imageUrl?: string | null
          name: string
          ownerId: string
          propertyType?: Database["public"]["Enums"]["PropertyType"]
          sale_notes?: string | null
          sale_price?: number | null
          state: string
          status?: Database["public"]["Enums"]["PropertyStatus"]
          updatedAt?: string
          version?: number
          zipCode: string
        }
        Update: {
          address?: string
          city?: string
          createdAt?: string
          date_sold?: string | null
          description?: string | null
          id?: string
          imageUrl?: string | null
          name?: string
          ownerId?: string
          propertyType?: Database["public"]["Enums"]["PropertyType"]
          sale_notes?: string | null
          sale_price?: number | null
          state?: string
          status?: Database["public"]["Enums"]["PropertyStatus"]
          updatedAt?: string
          version?: number
          zipCode?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_ownerid_fkey"
            columns: ["ownerId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          caption: string | null
          createdAt: string
          displayOrder: number
          id: string
          isPrimary: boolean
          propertyId: string
          updatedAt: string
          uploadedById: string | null
          url: string
        }
        Insert: {
          caption?: string | null
          createdAt?: string
          displayOrder?: number
          id?: string
          isPrimary?: boolean
          propertyId: string
          updatedAt?: string
          uploadedById?: string | null
          url: string
        }
        Update: {
          caption?: string | null
          createdAt?: string
          displayOrder?: number
          id?: string
          isPrimary?: boolean
          propertyId?: string
          updatedAt?: string
          uploadedById?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_images_uploadedById_fkey"
            columns: ["uploadedById"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_collection_settings: {
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
            foreignKeyName: "rentcollectionsettings_propertyid_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentcollectionsettings_tenantid_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentcollectionsettings_unitid_fkey"
            columns: ["unitId"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_due: {
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
            foreignKeyName: "rentcharge_leaseid_fkey"
            columns: ["leaseId"]
            isOneToOne: false
            referencedRelation: "lease"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentcharge_tenantid_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentcharge_unitid_fkey"
            columns: ["unitId"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_payment: {
        Row: {
          amount: number
          createdAt: string | null
          dueDate: string | null
          failureReason: string | null
          id: string
          landlordId: string
          landlordReceives: number
          lateFeeAmount: number | null
          lateFeeApplied: boolean | null
          lateFeeAppliedAt: string | null
          leaseId: string
          paidAt: string | null
          paymentType: string
          platformFee: number
          status: string | null
          stripeFee: number
          stripeInvoiceId: string | null
          stripePaymentIntentId: string | null
          subscriptionId: string | null
          tenantId: string
          version: number
        }
        Insert: {
          amount: number
          createdAt?: string | null
          dueDate?: string | null
          failureReason?: string | null
          id?: string
          landlordId: string
          landlordReceives: number
          lateFeeAmount?: number | null
          lateFeeApplied?: boolean | null
          lateFeeAppliedAt?: string | null
          leaseId: string
          paidAt?: string | null
          paymentType: string
          platformFee: number
          status?: string | null
          stripeFee: number
          stripeInvoiceId?: string | null
          stripePaymentIntentId?: string | null
          subscriptionId?: string | null
          tenantId: string
          version?: number
        }
        Update: {
          amount?: number
          createdAt?: string | null
          dueDate?: string | null
          failureReason?: string | null
          id?: string
          landlordId?: string
          landlordReceives?: number
          lateFeeAmount?: number | null
          lateFeeApplied?: boolean | null
          lateFeeAppliedAt?: string | null
          leaseId?: string
          paidAt?: string | null
          paymentType?: string
          platformFee?: number
          status?: string | null
          stripeFee?: number
          stripeInvoiceId?: string | null
          stripePaymentIntentId?: string | null
          subscriptionId?: string | null
          tenantId?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rentpayment_landlordid_fkey"
            columns: ["landlordId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentpayment_leaseid_fkey"
            columns: ["leaseId"]
            isOneToOne: false
            referencedRelation: "lease"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentpayment_subscriptionid_fkey"
            columns: ["subscriptionId"]
            isOneToOne: false
            referencedRelation: "rent_subscription"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentpayment_tenantid_fkey1"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_payments: {
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
            foreignKeyName: "rentpayment_paymentmethodid_fkey"
            columns: ["paymentMethodId"]
            isOneToOne: false
            referencedRelation: "payment_method"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentpayment_rentchargeid_fkey"
            columns: ["rentDueId"]
            isOneToOne: false
            referencedRelation: "rent_due"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentpayment_tenantid_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_subscription: {
        Row: {
          amount: number
          canceledAt: string | null
          createdAt: string | null
          currency: string
          dueDay: number
          id: string
          landlordId: string
          leaseId: string
          nextBillingDate: string | null
          pausedAt: string | null
          platformFeePercent: number
          status: string | null
          stripeCustomerId: string
          stripeSubscriptionId: string
          tenantId: string
          updatedAt: string | null
          version: number
        }
        Insert: {
          amount: number
          canceledAt?: string | null
          createdAt?: string | null
          currency?: string
          dueDay: number
          id?: string
          landlordId: string
          leaseId: string
          nextBillingDate?: string | null
          pausedAt?: string | null
          platformFeePercent: number
          status?: string | null
          stripeCustomerId: string
          stripeSubscriptionId: string
          tenantId: string
          updatedAt?: string | null
          version?: number
        }
        Update: {
          amount?: number
          canceledAt?: string | null
          createdAt?: string | null
          currency?: string
          dueDay?: number
          id?: string
          landlordId?: string
          leaseId?: string
          nextBillingDate?: string | null
          pausedAt?: string | null
          platformFeePercent?: number
          status?: string | null
          stripeCustomerId?: string
          stripeSubscriptionId?: string
          tenantId?: string
          updatedAt?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rentsubscription_landlordid_fkey"
            columns: ["landlordId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentsubscription_leaseid_fkey"
            columns: ["leaseId"]
            isOneToOne: false
            referencedRelation: "lease"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentsubscription_tenantid_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_report: {
        Row: {
          createdAt: string
          dayOfMonth: number | null
          dayOfWeek: number | null
          format: string
          frequency: string
          hour: number
          id: string
          isActive: boolean
          lastRunAt: string | null
          metadata: Json | null
          nextRunAt: string | null
          reportName: string
          reportType: string
          timezone: string
          updatedAt: string
          userId: string
        }
        Insert: {
          createdAt?: string
          dayOfMonth?: number | null
          dayOfWeek?: number | null
          format: string
          frequency: string
          hour?: number
          id?: string
          isActive?: boolean
          lastRunAt?: string | null
          metadata?: Json | null
          nextRunAt?: string | null
          reportName: string
          reportType: string
          timezone?: string
          updatedAt?: string
          userId: string
        }
        Update: {
          createdAt?: string
          dayOfMonth?: number | null
          dayOfWeek?: number | null
          format?: string
          frequency?: string
          hour?: number
          id?: string
          isActive?: boolean
          lastRunAt?: string | null
          metadata?: Json | null
          nextRunAt?: string | null
          reportName?: string
          reportType?: string
          timezone?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: []
      }
      security_audit_log: {
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
      stripe_processed_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          processed_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          processed_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          processed_at?: string
        }
        Relationships: []
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
      stripe_webhook_event: {
        Row: {
          createdAt: string | null
          eventId: string
          processedAt: string | null
          type: string
        }
        Insert: {
          createdAt?: string | null
          eventId: string
          processedAt?: string | null
          type: string
        }
        Update: {
          createdAt?: string | null
          eventId?: string
          processedAt?: string | null
          type?: string
        }
        Relationships: []
      }
      subscription: {
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
            foreignKeyName: "subscription_userid_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant: {
        Row: {
          archived_at: string | null
          auth_user_id: string | null
          autopay_configured_at: string | null
          autopay_day: number | null
          autopay_enabled: boolean | null
          autopay_frequency: string | null
          avatarUrl: string | null
          createdAt: string
          email: string
          emergencyContact: string | null
          firstName: string | null
          id: string
          invitation_accepted_at: string | null
          invitation_expires_at: string | null
          invitation_sent_at: string | null
          invitation_status:
            | Database["public"]["Enums"]["invitation_status"]
            | null
          invitation_token: string | null
          lastName: string | null
          move_out_date: string | null
          move_out_reason: string | null
          name: string | null
          payment_method_added_at: string | null
          phone: string | null
          status: Database["public"]["Enums"]["TenantStatus"]
          stripe_customer_id: string | null
          updatedAt: string
          userId: string | null
          version: number
        }
        Insert: {
          archived_at?: string | null
          auth_user_id?: string | null
          autopay_configured_at?: string | null
          autopay_day?: number | null
          autopay_enabled?: boolean | null
          autopay_frequency?: string | null
          avatarUrl?: string | null
          createdAt?: string
          email: string
          emergencyContact?: string | null
          firstName?: string | null
          id?: string
          invitation_accepted_at?: string | null
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invitation_status?:
            | Database["public"]["Enums"]["invitation_status"]
            | null
          invitation_token?: string | null
          lastName?: string | null
          move_out_date?: string | null
          move_out_reason?: string | null
          name?: string | null
          payment_method_added_at?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["TenantStatus"]
          stripe_customer_id?: string | null
          updatedAt?: string
          userId?: string | null
          version?: number
        }
        Update: {
          archived_at?: string | null
          auth_user_id?: string | null
          autopay_configured_at?: string | null
          autopay_day?: number | null
          autopay_enabled?: boolean | null
          autopay_frequency?: string | null
          avatarUrl?: string | null
          createdAt?: string
          email?: string
          emergencyContact?: string | null
          firstName?: string | null
          id?: string
          invitation_accepted_at?: string | null
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invitation_status?:
            | Database["public"]["Enums"]["invitation_status"]
            | null
          invitation_token?: string | null
          lastName?: string | null
          move_out_date?: string | null
          move_out_reason?: string | null
          name?: string | null
          payment_method_added_at?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["TenantStatus"]
          stripe_customer_id?: string | null
          updatedAt?: string
          userId?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_userid_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_payment_method: {
        Row: {
          bankName: string | null
          brand: string | null
          createdAt: string | null
          id: string
          isDefault: boolean | null
          last4: string | null
          stripeCustomerId: string
          stripePaymentMethodId: string
          tenantId: string
          type: string
          updatedAt: string | null
          verificationStatus: string | null
        }
        Insert: {
          bankName?: string | null
          brand?: string | null
          createdAt?: string | null
          id?: string
          isDefault?: boolean | null
          last4?: string | null
          stripeCustomerId: string
          stripePaymentMethodId: string
          tenantId: string
          type: string
          updatedAt?: string | null
          verificationStatus?: string | null
        }
        Update: {
          bankName?: string | null
          brand?: string | null
          createdAt?: string | null
          id?: string
          isDefault?: boolean | null
          last4?: string | null
          stripeCustomerId?: string
          stripePaymentMethodId?: string
          tenantId?: string
          type?: string
          updatedAt?: string | null
          verificationStatus?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenantpaymentmethod_tenantid_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      unit: {
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
          version: number
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
          version?: number
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
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "unit_propertyid_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access_log: {
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
            foreignKeyName: "useraccesslog_userid_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feature_access: {
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
            foreignKeyName: "userfeatureaccess_userid_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
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
            foreignKeyName: "userpreferences_userid_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_session: {
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
            foreignKeyName: "usersession_userid_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
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
          stripeAccountId: string | null
          stripeCustomerId: string | null
          subscription_status: string | null
          subscriptionTier: string | null
          supabaseId: string
          updatedAt: string
          version: number
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
          stripeAccountId?: string | null
          stripeCustomerId?: string | null
          subscription_status?: string | null
          subscriptionTier?: string | null
          supabaseId: string
          updatedAt?: string
          version?: number
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
          stripeAccountId?: string | null
          stripeCustomerId?: string | null
          subscription_status?: string | null
          subscriptionTier?: string | null
          supabaseId?: string
          updatedAt?: string
          version?: number
        }
        Relationships: []
      }
      webhook_event: {
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
      webhook_failures: {
        Row: {
          created_at: string | null
          error_message: string | null
          error_stack: string | null
          event_type: string
          failure_reason: string
          id: string
          last_retry_at: string | null
          raw_event_data: Json | null
          resolved_at: string | null
          retry_count: number | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          event_type: string
          failure_reason: string
          id?: string
          last_retry_at?: string | null
          raw_event_data?: Json | null
          resolved_at?: string | null
          retry_count?: number | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          event_type?: string
          failure_reason?: string
          id?: string
          last_retry_at?: string | null
          raw_event_data?: Json | null
          resolved_at?: string | null
          retry_count?: number | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      webhook_metrics: {
        Row: {
          business_logic_ms: number | null
          created_at: string | null
          database_operations_ms: number | null
          event_type: string
          id: string
          processing_duration_ms: number
          signature_verification_ms: number | null
          stripe_event_id: string
          success: boolean
        }
        Insert: {
          business_logic_ms?: number | null
          created_at?: string | null
          database_operations_ms?: number | null
          event_type: string
          id?: string
          processing_duration_ms: number
          signature_verification_ms?: number | null
          stripe_event_id: string
          success: boolean
        }
        Update: {
          business_logic_ms?: number | null
          created_at?: string | null
          database_operations_ms?: number | null
          event_type?: string
          id?: string
          processing_duration_ms?: number
          signature_verification_ms?: number | null
          stripe_event_id?: string
          success?: boolean
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
      dashboard_stats_mv: {
        Row: {
          active_leases: number | null
          active_tenants: number | null
          average_unit_rent: number | null
          avg_resolution_time_hours: number | null
          completed_maintenance: number | null
          completed_today_maintenance: number | null
          emergency_maintenance: number | null
          expired_leases: number | null
          expiring_soon_leases: number | null
          high_priority_maintenance: number | null
          in_progress_maintenance: number | null
          inactive_tenants: number | null
          last_updated: string | null
          low_priority_maintenance: number | null
          maintenance_units: number | null
          medium_priority_maintenance: number | null
          monthly_revenue: number | null
          new_tenants_this_month: number | null
          occupancy_change_percentage: number | null
          occupancy_rate: number | null
          occupied_properties: number | null
          occupied_units: number | null
          open_maintenance: number | null
          previous_month_revenue: number | null
          terminated_leases: number | null
          total_actual_rent: number | null
          total_lease_rent: number | null
          total_leases: number | null
          total_maintenance: number | null
          total_potential_rent: number | null
          total_properties: number | null
          total_security_deposits: number | null
          total_tenants: number | null
          total_units: number | null
          user_id: string | null
          vacant_units: number | null
          yearly_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_ownerid_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue_stats: {
        Row: {
          avg_attempts: number | null
          count: number | null
          email_type: string | null
          last_completed: string | null
          last_created: string | null
          last_failed: string | null
          priority: string | null
          status: string | null
        }
        Relationships: []
      }
      webhook_event_type_summary: {
        Row: {
          avg_duration_ms: number | null
          event_type: string | null
          failed_count: number | null
          last_received_at: string | null
          successful_count: number | null
          total_count: number | null
        }
        Relationships: []
      }
      webhook_health_summary: {
        Row: {
          avg_duration_ms: number | null
          failed_events: number | null
          hour: string | null
          max_duration_ms: number | null
          min_duration_ms: number | null
          success_rate_percentage: number | null
          successful_events: number | null
          total_events: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_tenant_from_auth_user: {
        Args: { p_auth_user_id: string }
        Returns: {
          activated: boolean
          tenant_id: string
        }[]
      }
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
        Args: never
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
      auth_sync_user_with_database:
        | {
            Args: {
              p_avatar_url?: string
              p_email: string
              p_name?: string
              p_phone?: string
              p_supabase_id: string
            }
            Returns: {
              avatar_url: string
              bio: string
              created_at: string
              email: string
              email_verified: boolean
              id: string
              is_new_user: boolean
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
        | { Args: { p_email: string; p_supabase_id: string }; Returns: Json }
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
        Args: { p_user_id: string }
        Returns: {
          noi: number
          property_id: string
          property_name: string
          total_expenses: number
          total_revenue: number
        }[]
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
      check_event_processed: { Args: { p_event_id: string }; Returns: boolean }
      check_lease_expiry_notifications: { Args: never; Returns: undefined }
      check_user_feature_access: {
        Args: { p_feature: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_dashboard_history: { Args: never; Returns: number }
      cleanup_expired_drafts: { Args: never; Returns: undefined }
      cleanup_old_email_queue_entries: { Args: never; Returns: number }
      cleanup_old_stripe_events: {
        Args: { p_days_to_keep?: number }
        Returns: number
      }
      cleanup_old_webhook_data: {
        Args: never
        Returns: {
          rows_deleted: number
          table_name: string
        }[]
      }
      create_dashboard_stats_snapshot: { Args: never; Returns: number }
      create_lease_with_financial_calculations: {
        Args: {
          p_end_date: string
          p_lease_terms?: string
          p_rent_amount: number
          p_security_deposit?: number
          p_start_date: string
          p_tenant_id: string
          p_unit_id: string
          p_user_id: string
        }
        Returns: Json
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      detect_webhook_health_issues: {
        Args: never
        Returns: {
          affected_count: number
          description: string
          first_occurrence: string
          issue_type: string
          last_occurrence: string
          severity: string
        }[]
      }
      execute_stripe_fdw_query: { Args: { sql_query: string }; Returns: Json }
      get_active_stripe_products: {
        Args: never
        Returns: {
          currency: string
          metadata: Json
          monthly_amount: number
          monthly_price_id: string
          product_description: string
          product_id: string
          product_name: string
          yearly_amount: number
          yearly_price_id: string
        }[]
      }
      get_auth_uid: { Args: never; Returns: string }
      get_auth_uid_text: { Args: never; Returns: string }
      get_auth_uid_uuid: { Args: never; Returns: string }
      get_billing_insights: {
        Args: { end_date?: string; start_date?: string; user_id: string }
        Returns: Json
      }
      get_dashboard_financial_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_dashboard_metrics: { Args: { p_user_id: string }; Returns: Json }
      get_dashboard_stats: { Args: { p_user_id: string }; Returns: Json }
      get_dashboard_time_series: {
        Args: { p_days?: number; p_metric_name: string; p_user_id: string }
        Returns: Json
      }
      get_entity_permissions: {
        Args: { p_entity_id: string; p_entity_type: string; p_user_id: string }
        Returns: Json
      }
      get_events_pending_recovery: {
        Args: { p_hours_old?: number; p_max_retries?: number }
        Returns: {
          event_type: string
          last_retry_at: string
          processed_at: string
          retry_count: number
          stripe_event_id: string
        }[]
      }
      get_expense_summary: {
        Args: { p_user_id: string; p_year?: number }
        Returns: Json
      }
      get_financial_overview: {
        Args: { p_user_id: string; p_year?: number }
        Returns: Json
      }
      get_invoice_statistics: { Args: { p_user_id: string }; Returns: Json }
      get_jwt_claim: { Args: { claim: string }; Returns: string }
      get_jwt_role: { Args: never; Returns: string }
      get_lease_financial_summary: {
        Args: { p_user_id: string }
        Returns: {
          active_leases: number
          total_deposits: number
          total_leases: number
          total_monthly_rent: number
          total_outstanding_balance: number
          total_paid_amount: number
          total_pending_amount: number
        }[]
      }
      get_leases_with_financial_analytics: {
        Args: { p_status?: string; p_user_id: string }
        Returns: Json
      }
      get_maintenance_analytics: { Args: { user_id: string }; Returns: Json }
      get_metric_trend: {
        Args: { p_metric_name: string; p_period?: string; p_user_id: string }
        Returns: Json
      }
      get_n8n_webhook_url: { Args: never; Returns: string }
      get_occupancy_change: {
        Args: { p_days_back?: number; p_user_id: string }
        Returns: number
      }
      get_occupancy_trends: {
        Args: { p_months?: number; p_user_id: string }
        Returns: {
          occupancy_rate: number
          period: string
        }[]
      }
      get_property_financial_analytics: {
        Args: {
          p_property_id?: string
          p_timeframe?: string
          p_user_id: string
        }
        Returns: Json[]
      }
      get_property_maintenance_analytics: {
        Args: {
          p_property_id?: string
          p_timeframe?: string
          p_user_id: string
        }
        Returns: Json[]
      }
      get_property_occupancy_analytics: {
        Args: { p_period?: string; p_property_id?: string; p_user_id: string }
        Returns: Json[]
      }
      get_property_performance:
        | {
            Args: { p_user_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_property_performance(p_user_id => text), public.get_property_performance(p_user_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_user_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_property_performance(p_user_id => text), public.get_property_performance(p_user_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      get_property_performance_analytics: {
        Args: {
          p_limit?: number
          p_property_id?: string
          p_timeframe?: string
          p_user_id: string
        }
        Returns: Json[]
      }
      get_property_stats: { Args: { p_user_id: string }; Returns: Json }
      get_property_units: {
        Args: { p_property_id: string; p_user_id: string }
        Returns: Json
      }
      get_resend_api_key: { Args: never; Returns: string }
      get_revenue_trends: {
        Args: { p_months?: number; p_user_id: string }
        Returns: {
          growth: number
          period: string
          previous_period_revenue: number
          revenue: number
        }[]
      }
      get_stripe_customer_by_user_id: {
        Args: { p_user_id: string }
        Returns: string
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
      get_trial_days_remaining: { Args: { p_user_id: string }; Returns: number }
      get_unit_statistics: { Args: { p_user_id: string }; Returns: Json }
      get_unread_notification_count: {
        Args: { user_id: string }
        Returns: number
      }
      get_upcoming_invoice_preview: {
        Args: { p_user_id: string }
        Returns: {
          amount_due: number
          currency: string
          next_payment_attempt: string
          period_end: string
          period_start: string
        }[]
      }
      get_user_active_subscription: {
        Args: { p_user_id: string }
        Returns: {
          cancel_at_period_end: boolean
          canceled_at: string
          current_period_end: string
          current_period_start: string
          customer_id: string
          plan_amount: number
          plan_currency: string
          plan_id: string
          plan_interval: string
          plan_name: string
          status: string
          subscription_id: string
          trial_end: string
          trial_start: string
        }[]
      }
      get_user_id: { Args: never; Returns: string }
      get_user_id_by_stripe_customer: {
        Args: { p_stripe_customer_id: string }
        Returns: string
      }
      get_user_invoices: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          amount_due: number
          amount_paid: number
          created_at: string
          currency: string
          due_date: string
          hosted_invoice_url: string
          invoice_id: string
          invoice_number: string
          invoice_pdf: string
          paid: boolean
          status: string
        }[]
      }
      get_user_payment_methods: {
        Args: { p_user_id: string }
        Returns: {
          card_brand: string
          card_exp_month: number
          card_exp_year: number
          card_last4: string
          created_at: string
          is_default: boolean
          payment_method_id: string
          type: string
        }[]
      }
      get_user_plan_limits: {
        Args: { p_user_id: string }
        Returns: {
          has_api_access: boolean
          has_white_label: boolean
          plan_name: string
          property_limit: number
          storage_gb: number
          support_level: string
          unit_limit: number
          user_limit: number
        }[]
      }
      get_user_subscription_history: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          canceled_at: string
          created_at: string
          current_period_end: string
          current_period_start: string
          ended_at: string
          plan_amount: number
          plan_currency: string
          plan_name: string
          status: string
          subscription_id: string
        }[]
      }
      get_webhook_statistics: {
        Args: never
        Returns: {
          last_hour_events: number
          today_events: number
          total_events: number
        }[]
      }
      health_check: {
        Args: never
        Returns: {
          at: string
          ok: boolean
        }[]
      }
      health_check_analytics: { Args: never; Returns: boolean }
      hook_password_verification_attempt: {
        Args: { event: Json }
        Returns: Json
      }
      is_user_on_trial: { Args: { p_user_id: string }; Returns: boolean }
      link_stripe_customer_to_user: {
        Args: { p_email: string; p_stripe_customer_id: string }
        Returns: string
      }
      mark_all_notifications_read: {
        Args: { user_id: string }
        Returns: number
      }
      mark_stripe_event_failed: {
        Args: { p_event_id: string; p_failure_reason: string }
        Returns: boolean
      }
      record_stripe_event: {
        Args: { p_event_id: string; p_event_type: string }
        Returns: boolean
      }
      refresh_dashboard_stats_mv: { Args: never; Returns: undefined }
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
      send_email_via_resend: {
        Args: {
          p_from?: string
          p_html: string
          p_subject: string
          p_to: string
        }
        Returns: boolean
      }
      send_payment_failed_email: {
        Args: {
          p_amount: number
          p_attempt_count: number
          p_currency: string
          p_failure_message?: string
          p_subscription_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      send_payment_success_email: {
        Args: {
          p_amount_paid: number
          p_currency: string
          p_subscription_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      send_tenant_invitation: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: Json
      }
      send_trial_ending_email: {
        Args: {
          p_days_remaining: number
          p_subscription_id: string
          p_trial_end: string
          p_user_id: string
        }
        Returns: boolean
      }
      terminate_lease: {
        Args: { p_lease_id: string; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      terminate_lease_with_financial_calculations: {
        Args: {
          p_lease_id: string
          p_termination_date?: string
          p_termination_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      update_lease_with_financial_calculations: {
        Args: {
          p_end_date?: string
          p_lease_id: string
          p_lease_terms?: string
          p_rent_amount?: number
          p_security_deposit?: number
          p_start_date?: string
          p_status?: string
          p_user_id: string
        }
        Returns: Json
      }
      update_stripe_event_retry: {
        Args: { p_event_id: string; p_retry_count: number }
        Returns: boolean
      }
      user_is_active_tenant_of_unit: {
        Args: { unit_id: string }
        Returns: boolean
      }
      user_owns_property: { Args: { property_id: string }; Returns: boolean }
      validate_password_strength: {
        Args: { p_password: string }
        Returns: Json
      }
      verify_security_compliance: { Args: never; Returns: Json }
      verify_stripe_webhook: {
        Args: { p_payload: string; p_signature: string }
        Returns: Json
      }
    }
    Enums: {
      ActivityEntityType:
        | "PROPERTY"
        | "TENANT"
        | "MAINTENANCE"
        | "PAYMENT"
        | "LEASE"
        | "UNIT"
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
      customer_invoice_status:
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
      invitation_status: "PENDING" | "SENT" | "ACCEPTED" | "EXPIRED" | "REVOKED"
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
      Priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
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
        | "DUE"
        | "PAID"
        | "VOID"
      RequestStatus:
        | "OPEN"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELED"
        | "ON_HOLD"
        | "CLOSED"
      SubStatus:
        | "ACTIVE"
        | "TRIALING"
        | "PAST_DUE"
        | "CANCELED"
        | "UNPAID"
        | "INCOMPLETE"
        | "INCOMPLETE_EXPIRED"
      TenantStatus:
        | "ACTIVE"
        | "INACTIVE"
        | "EVICTED"
        | "PENDING"
        | "MOVED_OUT"
        | "ARCHIVED"
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
        "PROPERTY",
        "TENANT",
        "MAINTENANCE",
        "PAYMENT",
        "LEASE",
        "UNIT",
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
      customer_invoice_status: [
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
      invitation_status: ["PENDING", "SENT", "ACCEPTED", "EXPIRED", "REVOKED"],
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
      Priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
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
        "DUE",
        "PAID",
        "VOID",
      ],
      RequestStatus: [
        "OPEN",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELED",
        "ON_HOLD",
        "CLOSED",
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
      TenantStatus: [
        "ACTIVE",
        "INACTIVE",
        "EVICTED",
        "PENDING",
        "MOVED_OUT",
        "ARCHIVED",
      ],
      UnitStatus: ["VACANT", "OCCUPIED", "MAINTENANCE", "RESERVED"],
      UserRole: ["OWNER", "MANAGER", "TENANT", "ADMIN"],
    },
  },
} as const
