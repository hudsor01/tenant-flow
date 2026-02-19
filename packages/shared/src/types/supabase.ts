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
      activity: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      blogs: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          published_at: string | null
          quality_score: number | null
          reading_time: number | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          published_at?: string | null
          quality_score?: number | null
          reading_time?: number | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          published_at?: string | null
          quality_score?: number | null
          reading_time?: number | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string | null
          document_type: string
          entity_id: string
          entity_type: string
          file_path: string
          file_size: number | null
          id: string
          storage_url: string
        }
        Insert: {
          created_at?: string | null
          document_type: string
          entity_id: string
          entity_type: string
          file_path: string
          file_size?: number | null
          id?: string
          storage_url: string
        }
        Update: {
          created_at?: string | null
          document_type?: string
          entity_id?: string
          entity_type?: string
          file_path?: string
          file_size?: number | null
          id?: string
          storage_url?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string | null
          expense_date: string
          id: string
          maintenance_request_id: string
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          expense_date: string
          id?: string
          maintenance_request_id: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          expense_date?: string
          id?: string
          maintenance_request_id?: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_tenants: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          lease_id: string
          responsibility_percentage: number
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          lease_id: string
          responsibility_percentage?: number
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          lease_id?: string
          responsibility_percentage?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_tenants_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          auto_pay_enabled: boolean | null
          created_at: string | null
          docuseal_submission_id: string | null
          end_date: string
          governing_state: string | null
          grace_period_days: number | null
          id: string
          late_fee_amount: number | null
          late_fee_days: number | null
          lead_paint_disclosure_acknowledged: boolean | null
          lease_status: string
          max_occupants: number | null
          owner_signature_ip: string | null
          owner_signature_method: string | null
          owner_signed_at: string | null
          owner_user_id: string
          payment_day: number
          pet_deposit: number | null
          pet_rent: number | null
          pets_allowed: boolean | null
          primary_tenant_id: string
          property_built_before_1978: boolean | null
          property_rules: string | null
          rent_amount: number
          rent_currency: string
          security_deposit: number
          sent_for_signature_at: string | null
          start_date: string
          stripe_connected_account_id: string | null
          stripe_subscription_id: string | null
          stripe_subscription_status: string
          subscription_failure_reason: string | null
          subscription_last_attempt_at: string | null
          subscription_retry_count: number | null
          tenant_responsible_utilities: string[] | null
          tenant_signature_ip: string | null
          tenant_signature_method: string | null
          tenant_signed_at: string | null
          unit_id: string
          updated_at: string | null
          utilities_included: string[] | null
        }
        Insert: {
          auto_pay_enabled?: boolean | null
          created_at?: string | null
          docuseal_submission_id?: string | null
          end_date: string
          governing_state?: string | null
          grace_period_days?: number | null
          id?: string
          late_fee_amount?: number | null
          late_fee_days?: number | null
          lead_paint_disclosure_acknowledged?: boolean | null
          lease_status?: string
          max_occupants?: number | null
          owner_signature_ip?: string | null
          owner_signature_method?: string | null
          owner_signed_at?: string | null
          owner_user_id: string
          payment_day?: number
          pet_deposit?: number | null
          pet_rent?: number | null
          pets_allowed?: boolean | null
          primary_tenant_id: string
          property_built_before_1978?: boolean | null
          property_rules?: string | null
          rent_amount: number
          rent_currency?: string
          security_deposit: number
          sent_for_signature_at?: string | null
          start_date: string
          stripe_connected_account_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string
          subscription_failure_reason?: string | null
          subscription_last_attempt_at?: string | null
          subscription_retry_count?: number | null
          tenant_responsible_utilities?: string[] | null
          tenant_signature_ip?: string | null
          tenant_signature_method?: string | null
          tenant_signed_at?: string | null
          unit_id: string
          updated_at?: string | null
          utilities_included?: string[] | null
        }
        Update: {
          auto_pay_enabled?: boolean | null
          created_at?: string | null
          docuseal_submission_id?: string | null
          end_date?: string
          governing_state?: string | null
          grace_period_days?: number | null
          id?: string
          late_fee_amount?: number | null
          late_fee_days?: number | null
          lead_paint_disclosure_acknowledged?: boolean | null
          lease_status?: string
          max_occupants?: number | null
          owner_signature_ip?: string | null
          owner_signature_method?: string | null
          owner_signed_at?: string | null
          owner_user_id?: string
          payment_day?: number
          pet_deposit?: number | null
          pet_rent?: number | null
          pets_allowed?: boolean | null
          primary_tenant_id?: string
          property_built_before_1978?: boolean | null
          property_rules?: string | null
          rent_amount?: number
          rent_currency?: string
          security_deposit?: number
          sent_for_signature_at?: string | null
          start_date?: string
          stripe_connected_account_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string
          subscription_failure_reason?: string | null
          subscription_last_attempt_at?: string | null
          subscription_retry_count?: number | null
          tenant_responsible_utilities?: string[] | null
          tenant_signature_ip?: string | null
          tenant_signature_method?: string | null
          tenant_signed_at?: string | null
          unit_id?: string
          updated_at?: string | null
          utilities_included?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_primary_tenant_id_fkey"
            columns: ["primary_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_stripe_connected_account_id_fkey"
            columns: ["stripe_connected_account_id"]
            isOneToOne: false
            referencedRelation: "stripe_connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          description: string
          estimated_cost: number | null
          id: string
          inspection_date: string | null
          inspection_findings: string | null
          inspector_id: string | null
          owner_user_id: string
          priority: string
          requested_by: string | null
          scheduled_date: string | null
          status: string
          tenant_id: string
          title: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description: string
          estimated_cost?: number | null
          id?: string
          inspection_date?: string | null
          inspection_findings?: string | null
          inspector_id?: string | null
          owner_user_id: string
          priority?: string
          requested_by?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id: string
          title?: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string
          estimated_cost?: number | null
          id?: string
          inspection_date?: string | null
          inspection_findings?: string | null
          inspector_id?: string | null
          owner_user_id?: string
          priority?: string
          requested_by?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id?: string
          title?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          delivery_channel: string | null
          id: string
          last_error: string | null
          notification_id: string
          sent_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          delivery_channel?: string | null
          id?: string
          last_error?: string | null
          notification_id: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          delivery_channel?: string | null
          id?: string
          last_error?: string | null
          notification_id?: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string | null
          email: boolean
          general: boolean
          id: string
          in_app: boolean
          leases: boolean
          maintenance: boolean
          push: boolean
          sms: boolean
          updated_at: string | null
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string | null
          email?: boolean
          general?: boolean
          id?: string
          in_app?: boolean
          leases?: boolean
          maintenance?: boolean
          push?: boolean
          sms?: boolean
          updated_at?: string | null
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string | null
          email?: boolean
          general?: boolean
          id?: string
          in_app?: boolean
          leases?: boolean
          maintenance?: boolean
          push?: boolean
          sms?: boolean
          updated_at?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          notification_type: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          bank_name: string | null
          brand: string | null
          created_at: string | null
          exp_month: number | null
          exp_year: number | null
          id: string
          is_default: boolean | null
          last_four: string | null
          stripe_payment_method_id: string
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          bank_name?: string | null
          brand?: string | null
          created_at?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          stripe_payment_method_id: string
          tenant_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          bank_name?: string | null
          brand?: string | null
          created_at?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          stripe_payment_method_id?: string
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedules: {
        Row: {
          created_at: string | null
          frequency: string
          id: string
          is_active: boolean | null
          lease_id: string
          next_payment_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          lease_id: string
          next_payment_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          lease_id?: string
          next_payment_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          attempted_at: string | null
          created_at: string | null
          failure_reason: string | null
          id: string
          last_attempted_at: string | null
          payment_method_id: string | null
          rent_payment_id: string
          retry_count: number | null
          status: string
          stripe_payment_intent_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          attempted_at?: string | null
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          last_attempted_at?: string | null
          payment_method_id?: string | null
          rent_payment_id: string
          retry_count?: number | null
          status: string
          stripe_payment_intent_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          attempted_at?: string | null
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          last_attempted_at?: string | null
          payment_method_id?: string | null
          rent_payment_id?: string
          retry_count?: number | null
          status?: string
          stripe_payment_intent_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_rent_payment_id_fkey"
            columns: ["rent_payment_id"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_internal_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          idempotency_key: string
          payload_hash: string
          processed_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          idempotency_key: string
          payload_hash: string
          processed_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          idempotency_key?: string
          payload_hash?: string
          processed_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string | null
          date_sold: string | null
          id: string
          name: string
          owner_user_id: string
          postal_code: string
          property_type: string
          sale_price: number | null
          search_vector: unknown
          state: string
          status: string
          stripe_connected_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          created_at?: string | null
          date_sold?: string | null
          id?: string
          name: string
          owner_user_id: string
          postal_code: string
          property_type: string
          sale_price?: number | null
          search_vector?: unknown
          state: string
          status?: string
          stripe_connected_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string | null
          date_sold?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          postal_code?: string
          property_type?: string
          sale_price?: number | null
          search_vector?: unknown
          state?: string
          status?: string
          stripe_connected_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_stripe_connected_account_id_fkey"
            columns: ["stripe_connected_account_id"]
            isOneToOne: false
            referencedRelation: "stripe_connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          property_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          property_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_due: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          lease_id: string | null
          status: string | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          lease_id?: string | null
          status?: string | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          lease_id?: string | null
          status?: string | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rent_due_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_payments: {
        Row: {
          amount: number
          application_fee_amount: number
          created_at: string | null
          currency: string
          due_date: string
          id: string
          late_fee_amount: number | null
          lease_id: string
          notes: string | null
          paid_date: string | null
          payment_method_type: string
          period_end: string
          period_start: string
          status: string
          stripe_payment_intent_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          application_fee_amount: number
          created_at?: string | null
          currency?: string
          due_date: string
          id?: string
          late_fee_amount?: number | null
          lease_id: string
          notes?: string | null
          paid_date?: string | null
          payment_method_type: string
          period_end: string
          period_start: string
          status: string
          stripe_payment_intent_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          application_fee_amount?: number
          created_at?: string | null
          currency?: string
          due_date?: string
          id?: string
          late_fee_amount?: number | null
          lease_id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method_type?: string
          period_end?: string
          period_start?: string
          status?: string
          stripe_payment_intent_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          execution_status: string
          execution_time_ms: number | null
          file_path: string | null
          file_size: number | null
          id: string
          report_id: string
          started_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_status: string
          execution_time_ms?: number | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          report_id: string
          started_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_status?: string
          execution_time_ms?: number | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          report_id?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_runs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          next_run_at: string | null
          owner_user_id: string
          report_type: string
          schedule_cron: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          next_run_at?: string | null
          owner_user_id: string
          report_type: string
          schedule_cron?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          next_run_at?: string | null
          owner_user_id?: string
          report_type?: string
          schedule_cron?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          message: string
          metadata: Json | null
          request_id: string | null
          resource_id: string | null
          resource_type: string | null
          severity: string
          tags: string[] | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          message: string
          metadata?: Json | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          severity?: string
          tags?: string[] | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          message?: string
          metadata?: Json | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          severity?: string
          tags?: string[] | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      stripe_connected_accounts: {
        Row: {
          business_name: string | null
          business_type: string
          charges_enabled: boolean | null
          completion_percentage: number | null
          created_at: string | null
          current_step: string | null
          default_platform_fee_percent: number | null
          id: string
          onboarding_completed_at: string | null
          onboarding_started_at: string | null
          onboarding_status: string | null
          payouts_enabled: boolean | null
          requirements_due: string[] | null
          stripe_account_id: string
          tax_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_name?: string | null
          business_type: string
          charges_enabled?: boolean | null
          completion_percentage?: number | null
          created_at?: string | null
          current_step?: string | null
          default_platform_fee_percent?: number | null
          id?: string
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_status?: string | null
          payouts_enabled?: boolean | null
          requirements_due?: string[] | null
          stripe_account_id: string
          tax_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_name?: string | null
          business_type?: string
          charges_enabled?: boolean | null
          completion_percentage?: number | null
          created_at?: string | null
          current_step?: string | null
          default_platform_fee_percent?: number | null
          id?: string
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_status?: string | null
          payouts_enabled?: boolean | null
          requirements_due?: string[] | null
          stripe_account_id?: string
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_owners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invitation_code: string
          invitation_url: string
          lease_id: string | null
          owner_user_id: string
          property_id: string | null
          status: string
          type: string | null
          unit_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invitation_code: string
          invitation_url: string
          lease_id?: string | null
          owner_user_id: string
          property_id?: string | null
          status?: string
          type?: string | null
          unit_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_code?: string
          invitation_url?: string
          lease_id?: string | null
          owner_user_id?: string
          property_id?: string | null
          status?: string
          type?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_accepted_by_user_id_fkey"
            columns: ["accepted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          id: string
          identity_verified: boolean | null
          ssn_last_four: string | null
          stripe_customer_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          identity_verified?: boolean | null
          ssn_last_four?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          identity_verified?: boolean | null
          ssn_last_four?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          created_at: string | null
          id: string
          owner_user_id: string
          property_id: string
          rent_amount: number
          rent_currency: string
          rent_period: string
          square_feet: number | null
          status: string
          unit_number: string | null
          updated_at: string | null
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          id?: string
          owner_user_id: string
          property_id: string
          rent_amount: number
          rent_currency?: string
          rent_period?: string
          square_feet?: number | null
          status?: string
          unit_number?: string | null
          updated_at?: string | null
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          id?: string
          owner_user_id?: string
          property_id?: string
          rent_amount?: number
          rent_currency?: string
          rent_period?: string
          square_feet?: number | null
          status?: string
          unit_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access_log: {
        Row: {
          accessed_at: string | null
          endpoint: string | null
          id: string
          ip_address: string | null
          method: string | null
          status_code: number | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string | null
          endpoint?: string | null
          id?: string
          ip_address?: string | null
          method?: string | null
          status_code?: number | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string | null
          endpoint?: string | null
          id?: string
          ip_address?: string | null
          method?: string | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_errors: {
        Row: {
          context: Json | null
          created_at: string | null
          error_code: string | null
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          ip_address: unknown
          resolution_notes: string | null
          resolved_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          ip_address?: unknown
          resolution_notes?: string | null
          resolved_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          ip_address?: unknown
          resolution_notes?: string | null
          resolved_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_feature_access: {
        Row: {
          access_level: string | null
          created_at: string | null
          feature_name: string
          granted_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          access_level?: string | null
          created_at?: string | null
          feature_name: string
          granted_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          access_level?: string | null
          created_at?: string | null
          feature_name?: string
          granted_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feature_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          language: string | null
          notifications_enabled: boolean | null
          theme: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tour_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          id: string
          last_seen_at: string | null
          skipped_at: string | null
          status: string
          tour_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          last_seen_at?: string | null
          skipped_at?: string | null
          status?: string
          tour_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          last_seen_at?: string | null
          skipped_at?: string | null
          status?: string
          tour_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tour_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string | null
          full_name: string
          id: string
          identity_verification_data: Json | null
          identity_verification_error: string | null
          identity_verification_session_id: string | null
          identity_verification_status: string | null
          identity_verified_at: string | null
          last_name: string | null
          onboarding_completed_at: string | null
          onboarding_status: string | null
          phone: string | null
          status: string
          stripe_customer_id: string | null
          updated_at: string | null
          user_type: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          full_name: string
          id?: string
          identity_verification_data?: Json | null
          identity_verification_error?: string | null
          identity_verification_session_id?: string | null
          identity_verification_status?: string | null
          identity_verified_at?: string | null
          last_name?: string | null
          onboarding_completed_at?: string | null
          onboarding_status?: string | null
          phone?: string | null
          status?: string
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_type: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          full_name?: string
          id?: string
          identity_verification_data?: Json | null
          identity_verification_error?: string | null
          identity_verification_session_id?: string | null
          identity_verification_status?: string | null
          identity_verified_at?: string | null
          last_name?: string | null
          onboarding_completed_at?: string | null
          onboarding_status?: string | null
          phone?: string | null
          status?: string
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_type?: string
        }
        Relationships: []
      }
      webhook_attempts: {
        Row: {
          created_at: string | null
          failure_reason: string | null
          id: string
          last_attempted_at: string | null
          retry_count: number | null
          status: string
          updated_at: string | null
          webhook_event_id: string
        }
        Insert: {
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          last_attempted_at?: string | null
          retry_count?: number | null
          status: string
          updated_at?: string | null
          webhook_event_id: string
        }
        Update: {
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          last_attempted_at?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
          webhook_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_attempts_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          external_id: string | null
          id: string
          processed_at: string | null
          raw_payload: Json
          webhook_source: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          external_id?: string | null
          id?: string
          processed_at?: string | null
          raw_payload: Json
          webhook_source?: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          external_id?: string | null
          id?: string
          processed_at?: string | null
          raw_payload?: Json
          webhook_source?: string
        }
        Relationships: []
      }
      webhook_metrics: {
        Row: {
          average_latency_ms: number | null
          created_at: string | null
          date: string
          event_type: string
          id: string
          total_failed: number | null
          total_processed: number | null
          total_received: number | null
        }
        Insert: {
          average_latency_ms?: number | null
          created_at?: string | null
          date: string
          event_type: string
          id?: string
          total_failed?: number | null
          total_processed?: number | null
          total_received?: number | null
        }
        Update: {
          average_latency_ms?: number | null
          created_at?: string | null
          date?: string
          event_type?: string
          id?: string
          total_failed?: number | null
          total_processed?: number | null
          total_received?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_internal_event_lock: {
        Args: {
          p_event_name: string
          p_idempotency_key: string
          p_payload_hash: string
        }
        Returns: {
          lock_acquired: boolean
        }[]
      }
      acquire_webhook_event_lock_with_id: {
        Args: {
          p_event_type: string
          p_external_id: string
          p_raw_payload?: Json
          p_webhook_source: string
        }
        Returns: {
          lock_acquired: boolean
          webhook_event_id: string
        }[]
      }
      activate_lease_with_pending_subscription: {
        Args: { p_lease_id: string }
        Returns: {
          error_message: string
          success: boolean
        }[]
      }
      assert_can_create_lease: {
        Args: { p_primary_tenant_id: string; p_unit_id: string }
        Returns: boolean
      }
      calculate_maintenance_metrics: {
        Args: {
          p_user_id?: string
          uid?: string
          user_id?: string
          user_id_param?: string
        }
        Returns: {
          avg_cost: number
          avg_resolution_hours: number
          completed_count: number
          emergency_count: number
          high_priority_count: number
          in_progress_count: number
          low_priority_count: number
          normal_priority_count: number
          open_count: number
          total_cost: number
          total_requests: number
        }[]
      }
      calculate_monthly_metrics: { Args: { p_user_id: string }; Returns: Json }
      check_user_feature_access: {
        Args: { p_feature: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_old_errors: { Args: never; Returns: number }
      cleanup_old_internal_events: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      cleanup_old_security_events: { Args: never; Returns: undefined }
      confirm_lease_subscription: {
        Args: { p_lease_id: string; p_subscription_id: string }
        Returns: undefined
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_common_errors: {
        Args: { hours_back?: number; limit_count?: number }
        Returns: {
          affected_users: number
          error_message: string
          error_type: string
          last_occurrence: string
          occurrences: number
        }[]
      }
      get_current_owner_user_id: { Args: never; Returns: string }
      get_current_property_owner_id: { Args: never; Returns: string }
      get_current_tenant_id: { Args: never; Returns: string }
      get_current_user_type: { Args: never; Returns: string }
      get_dashboard_stats: {
        Args: { p_user_id: string }
        Returns: {
          leases: Database["public"]["CompositeTypes"]["lease_stats_type"]
          maintenance: Database["public"]["CompositeTypes"]["maintenance_stats_type"]
          properties: Database["public"]["CompositeTypes"]["property_stats_type"]
          revenue: Database["public"]["CompositeTypes"]["revenue_stats_type"]
          tenants: Database["public"]["CompositeTypes"]["tenant_stats_type"]
          units: Database["public"]["CompositeTypes"]["unit_stats_type"]
        }[]
      }
      get_error_prone_users: {
        Args: { hours_back?: number; min_errors?: number }
        Returns: {
          error_count: number
          error_types: string[]
          user_id: string
        }[]
      }
      get_error_summary: {
        Args: { hours_back?: number }
        Returns: {
          error_count: number
          error_type: string
          last_occurrence: string
          unique_users: number
        }[]
      }
      get_expense_summary: { Args: { p_user_id: string }; Returns: Json }
      get_invoice_statistics: { Args: { p_user_id: string }; Returns: Json }
      get_lead_paint_compliance_report: {
        Args: never
        Returns: {
          compliance_percentage: number
          compliant_leases: number
          non_compliant_leases: number
          total_pre_1978_leases: number
        }[]
      }
      get_maintenance_analytics: { Args: { user_id: string }; Returns: Json }
      get_owner_lease_tenant_ids: { Args: never; Returns: string[] }
      get_property_performance_analytics: {
        Args: {
          p_limit?: number
          p_property_id?: string
          p_timeframe?: string
          p_user_id: string
        }
        Returns: {
          net_income: number
          occupancy_rate: number
          property_id: string
          property_name: string
          timeframe: string
          total_expenses: number
          total_revenue: number
        }[]
      }
      get_property_performance_cached: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_property_performance_trends: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_property_performance_with_trends: {
        Args: { p_limit?: number; p_timeframe?: string; p_user_id: string }
        Returns: {
          occupancy_rate: number
          previous_revenue: number
          property_id: string
          property_name: string
          timeframe: string
          total_revenue: number
          trend_percentage: number
        }[]
      }
      get_slow_rls_queries: {
        Args: { min_avg_time_ms?: number }
        Returns: {
          calls: number
          max_time_ms: number
          mean_time_ms: number
          query_preview: string
          total_time_ms: number
        }[]
      }
      get_stripe_customer_by_user_id: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_tenant_lease_ids: { Args: never; Returns: string[] }
      get_tenant_property_ids: { Args: never; Returns: string[] }
      get_tenant_unit_ids: { Args: never; Returns: string[] }
      get_tenants_by_owner: { Args: { p_user_id: string }; Returns: string[] }
      get_tenants_with_lease_by_owner: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_user_dashboard_activities: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          activity_type: string
          created_at: string
          description: string
          entity_id: string
          entity_type: string
          id: string
          title: string
          user_id: string
        }[]
      }
      get_user_id_by_stripe_customer: {
        Args: { p_stripe_customer_id: string }
        Returns: string
      }
      get_user_plan_limits: {
        Args: { p_user_id: string }
        Returns: {
          has_api_access: boolean
          has_white_label: boolean
          property_limit: number
          storage_gb: number
          support_level: string
          tenant_limit: number
          unit_limit: number
        }[]
      }
      get_user_sessions: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          id: string
          ip: unknown
          updated_at: string
          user_agent: string
          user_id: string
        }[]
      }
      health_check: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      ledger_aggregation: { Args: never; Returns: Json }
      link_stripe_customer_to_user: {
        Args: { p_email: string; p_stripe_customer_id: string }
        Returns: string
      }
      log_user_error: {
        Args: {
          p_context?: Json
          p_error_code?: string
          p_error_message?: string
          p_error_stack?: string
          p_error_type: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: string
      }
      process_payment_intent_failed: {
        Args: {
          p_amount: number
          p_failure_reason: string
          p_payment_intent_id: string
          p_rent_payment_id: string
        }
        Returns: undefined
      }
      process_subscription_status_change: {
        Args: {
          p_new_status: string
          p_subscription_failure_reason?: string
          p_subscription_id: string
        }
        Returns: undefined
      }
      require_stripe_schema: { Args: never; Returns: boolean }
      revoke_user_session: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: undefined
      }
      search_properties: {
        Args: { p_limit?: number; p_search_term: string; p_user_id: string }
        Returns: {
          address_line1: string
          city: string
          id: string
          name: string
          rank: number
          state: string
        }[]
      }
      sign_lease_and_check_activation: {
        Args: {
          p_lease_id: string
          p_signature_ip: string
          p_signature_method?: string
          p_signed_at: string
          p_signer_type: string
        }
        Returns: {
          both_signed: boolean
          error_message: string
          success: boolean
        }[]
      }
      upsert_rent_payment: {
        Args: {
          p_amount: number
          p_application_fee_amount?: number
          p_currency: string
          p_due_date: string
          p_lease_id: string
          p_paid_date?: string
          p_payment_method_type?: string
          p_period_end?: string
          p_period_start?: string
          p_status: string
          p_stripe_payment_intent_id?: string
          p_tenant_id: string
        }
        Returns: {
          id: string
          was_inserted: boolean
        }[]
      }
      user_is_tenant: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      lease_stats_type: {
        total: number | null
        active: number | null
        expired: number | null
        expiring_soon: number | null
      }
      maintenance_priority_type: {
        low: number | null
        normal: number | null
        high: number | null
        urgent: number | null
      }
      maintenance_stats_type: {
        total: number | null
        open: number | null
        in_progress: number | null
        completed: number | null
        completed_today: number | null
        avg_resolution_time: number | null
        by_priority:
          | Database["public"]["CompositeTypes"]["maintenance_priority_type"]
          | null
      }
      property_stats_type: {
        total: number | null
        occupied: number | null
        vacant: number | null
        occupancy_rate: number | null
        total_monthly_rent: number | null
        average_rent: number | null
      }
      revenue_stats_type: {
        monthly: number | null
        yearly: number | null
        growth: number | null
      }
      tenant_stats_type: {
        total: number | null
        active: number | null
        inactive: number | null
        new_this_month: number | null
      }
      time_series_point_type: {
        date: string | null
        value: number | null
      }
      unit_stats_type: {
        total: number | null
        occupied: number | null
        vacant: number | null
        maintenance: number | null
        average_rent: number | null
        available: number | null
        occupancy_rate: number | null
        occupancy_change: number | null
        total_potential_rent: number | null
        total_actual_rent: number | null
      }
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
    Enums: {},
  },
} as const
