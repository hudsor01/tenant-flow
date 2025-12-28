export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[]

export type Database = {
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
						foreignKeyName: 'activity_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'expenses_maintenance_request_id_fkey'
						columns: ['maintenance_request_id']
						isOneToOne: false
						referencedRelation: 'maintenance_requests'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'lease_tenants_lease_id_fkey'
						columns: ['lease_id']
						isOneToOne: false
						referencedRelation: 'leases'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'lease_tenants_tenant_id_fkey'
						columns: ['tenant_id']
						isOneToOne: false
						referencedRelation: 'tenants'
						referencedColumns: ['id']
					}
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
					lease_status: Database['public']['Enums']['lease_status']
					max_occupants: number | null
					owner_signature_ip: string | null
					owner_signature_method:
						| Database['public']['Enums']['signature_method']
						| null
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
					stripe_subscription_status: Database['public']['Enums']['stripe_subscription_status']
					subscription_failure_reason: string | null
					subscription_last_attempt_at: string | null
					subscription_retry_count: number | null
					tenant_responsible_utilities: string[] | null
					tenant_signature_ip: string | null
					tenant_signature_method:
						| Database['public']['Enums']['signature_method']
						| null
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
					lease_status?: Database['public']['Enums']['lease_status']
					max_occupants?: number | null
					owner_signature_ip?: string | null
					owner_signature_method?:
						| Database['public']['Enums']['signature_method']
						| null
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
					stripe_subscription_status?: Database['public']['Enums']['stripe_subscription_status']
					subscription_failure_reason?: string | null
					subscription_last_attempt_at?: string | null
					subscription_retry_count?: number | null
					tenant_responsible_utilities?: string[] | null
					tenant_signature_ip?: string | null
					tenant_signature_method?:
						| Database['public']['Enums']['signature_method']
						| null
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
					lease_status?: Database['public']['Enums']['lease_status']
					max_occupants?: number | null
					owner_signature_ip?: string | null
					owner_signature_method?:
						| Database['public']['Enums']['signature_method']
						| null
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
					stripe_subscription_status?: Database['public']['Enums']['stripe_subscription_status']
					subscription_failure_reason?: string | null
					subscription_last_attempt_at?: string | null
					subscription_retry_count?: number | null
					tenant_responsible_utilities?: string[] | null
					tenant_signature_ip?: string | null
					tenant_signature_method?:
						| Database['public']['Enums']['signature_method']
						| null
					tenant_signed_at?: string | null
					unit_id?: string
					updated_at?: string | null
					utilities_included?: string[] | null
				}
				Relationships: [
					{
						foreignKeyName: 'leases_owner_user_id_fkey'
						columns: ['owner_user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'leases_primary_tenant_id_fkey'
						columns: ['primary_tenant_id']
						isOneToOne: false
						referencedRelation: 'tenants'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'leases_stripe_connected_account_id_fkey'
						columns: ['stripe_connected_account_id']
						isOneToOne: false
						referencedRelation: 'stripe_connected_accounts'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'leases_unit_id_fkey'
						columns: ['unit_id']
						isOneToOne: false
						referencedRelation: 'units'
						referencedColumns: ['id']
					}
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
					priority: Database['public']['Enums']['maintenance_priority']
					requested_by: string | null
					scheduled_date: string | null
					status: Database['public']['Enums']['maintenance_status']
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
					priority?: Database['public']['Enums']['maintenance_priority']
					requested_by?: string | null
					scheduled_date?: string | null
					status?: Database['public']['Enums']['maintenance_status']
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
					priority?: Database['public']['Enums']['maintenance_priority']
					requested_by?: string | null
					scheduled_date?: string | null
					status?: Database['public']['Enums']['maintenance_status']
					tenant_id?: string
					title?: string
					unit_id?: string
					updated_at?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'maintenance_requests_assigned_to_fkey'
						columns: ['assigned_to']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'maintenance_requests_owner_user_id_fkey'
						columns: ['owner_user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'maintenance_requests_requested_by_fkey'
						columns: ['requested_by']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'maintenance_requests_tenant_id_fkey'
						columns: ['tenant_id']
						isOneToOne: false
						referencedRelation: 'tenants'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'maintenance_requests_unit_id_fkey'
						columns: ['unit_id']
						isOneToOne: false
						referencedRelation: 'units'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'notification_logs_notification_id_fkey'
						columns: ['notification_id']
						isOneToOne: false
						referencedRelation: 'notifications'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'notification_settings_user_fk'
						columns: ['user_id']
						isOneToOne: true
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
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
					notification_type: Database['public']['Enums']['notification_type']
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
					notification_type: Database['public']['Enums']['notification_type']
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
					notification_type?: Database['public']['Enums']['notification_type']
					read_at?: string | null
					title?: string
					user_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'notifications_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'payment_methods_tenant_id_fkey'
						columns: ['tenant_id']
						isOneToOne: false
						referencedRelation: 'tenants'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'payment_schedules_lease_id_fkey'
						columns: ['lease_id']
						isOneToOne: false
						referencedRelation: 'leases'
						referencedColumns: ['id']
					}
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
					status: Database['public']['Enums']['payment_status']
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
					status: Database['public']['Enums']['payment_status']
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
					status?: Database['public']['Enums']['payment_status']
					stripe_payment_intent_id?: string
					updated_at?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'payment_transactions_payment_method_id_fkey'
						columns: ['payment_method_id']
						isOneToOne: false
						referencedRelation: 'payment_methods'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'payment_transactions_rent_payment_id_fkey'
						columns: ['rent_payment_id']
						isOneToOne: false
						referencedRelation: 'rent_payments'
						referencedColumns: ['id']
					}
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
					status: Database['public']['Enums']['property_status']
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
					status?: Database['public']['Enums']['property_status']
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
					status?: Database['public']['Enums']['property_status']
					stripe_connected_account_id?: string | null
					updated_at?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'properties_owner_user_id_fkey'
						columns: ['owner_user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'properties_stripe_connected_account_id_fkey'
						columns: ['stripe_connected_account_id']
						isOneToOne: false
						referencedRelation: 'stripe_connected_accounts'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'property_images_property_id_fkey'
						columns: ['property_id']
						isOneToOne: false
						referencedRelation: 'properties'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'rent_due_unit_id_fkey'
						columns: ['unit_id']
						isOneToOne: false
						referencedRelation: 'units'
						referencedColumns: ['id']
					}
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
					paid_date: string | null
					payment_method_type: string
					period_end: string
					period_start: string
					status: Database['public']['Enums']['payment_status']
					stripe_payment_intent_id: string
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
					paid_date?: string | null
					payment_method_type: string
					period_end: string
					period_start: string
					status: Database['public']['Enums']['payment_status']
					stripe_payment_intent_id: string
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
					paid_date?: string | null
					payment_method_type?: string
					period_end?: string
					period_start?: string
					status?: Database['public']['Enums']['payment_status']
					stripe_payment_intent_id?: string
					tenant_id?: string
					updated_at?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'rent_payments_lease_id_fkey'
						columns: ['lease_id']
						isOneToOne: false
						referencedRelation: 'leases'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'rent_payments_tenant_id_fkey'
						columns: ['tenant_id']
						isOneToOne: false
						referencedRelation: 'tenants'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'report_runs_report_id_fkey'
						columns: ['report_id']
						isOneToOne: false
						referencedRelation: 'reports'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'reports_owner_user_id_fkey'
						columns: ['owner_user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'security_audit_log_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
				]
			}
			security_events: {
				Row: {
					created_at: string
					event_type: Database['public']['Enums']['security_event_type']
					id: string
					ip_address: unknown
					message: string
					metadata: Json | null
					request_id: string | null
					resource_id: string | null
					resource_type: string | null
					severity: Database['public']['Enums']['security_event_severity']
					tags: string[] | null
					user_agent: string | null
					user_email: string | null
					user_id: string | null
					user_type: string | null
				}
				Insert: {
					created_at?: string
					event_type: Database['public']['Enums']['security_event_type']
					id?: string
					ip_address?: unknown
					message: string
					metadata?: Json | null
					request_id?: string | null
					resource_id?: string | null
					resource_type?: string | null
					severity?: Database['public']['Enums']['security_event_severity']
					tags?: string[] | null
					user_agent?: string | null
					user_email?: string | null
					user_id?: string | null
					user_type?: string | null
				}
				Update: {
					created_at?: string
					event_type?: Database['public']['Enums']['security_event_type']
					id?: string
					ip_address?: unknown
					message?: string
					metadata?: Json | null
					request_id?: string | null
					resource_id?: string | null
					resource_type?: string | null
					severity?: Database['public']['Enums']['security_event_severity']
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
						foreignKeyName: 'property_owners_user_id_fkey'
						columns: ['user_id']
						isOneToOne: true
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'tenant_invitations_accepted_by_user_id_fkey'
						columns: ['accepted_by_user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'tenant_invitations_lease_id_fkey'
						columns: ['lease_id']
						isOneToOne: false
						referencedRelation: 'leases'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'tenant_invitations_owner_user_id_fkey'
						columns: ['owner_user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'tenant_invitations_property_id_fkey'
						columns: ['property_id']
						isOneToOne: false
						referencedRelation: 'properties'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'tenant_invitations_unit_id_fkey'
						columns: ['unit_id']
						isOneToOne: false
						referencedRelation: 'units'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'tenants_user_id_fkey'
						columns: ['user_id']
						isOneToOne: true
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
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
					status: Database['public']['Enums']['unit_status']
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
					status?: Database['public']['Enums']['unit_status']
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
					status?: Database['public']['Enums']['unit_status']
					unit_number?: string | null
					updated_at?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'units_owner_user_id_fkey'
						columns: ['owner_user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'units_property_id_fkey'
						columns: ['property_id']
						isOneToOne: false
						referencedRelation: 'properties'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'user_access_log_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'user_feature_access_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'user_preferences_user_id_fkey'
						columns: ['user_id']
						isOneToOne: true
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'user_tour_progress_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
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
						foreignKeyName: 'webhook_attempts_webhook_event_id_fkey'
						columns: ['webhook_event_id']
						isOneToOne: false
						referencedRelation: 'webhook_events'
						referencedColumns: ['id']
					}
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
			pg_stat_monitor: {
				Row: {
					application_name: string | null
					bucket: number | null
					bucket_done: boolean | null
					bucket_start_time: string | null
					calls: number | null
					client_ip: unknown
					cmd_type: number | null
					cmd_type_text: string | null
					comments: string | null
					cpu_sys_time: number | null
					cpu_user_time: number | null
					datname: string | null
					dbid: unknown
					elevel: number | null
					jit_deform_count: number | null
					jit_deform_time: number | null
					jit_emission_count: number | null
					jit_emission_time: number | null
					jit_functions: number | null
					jit_generation_time: number | null
					jit_inlining_count: number | null
					jit_inlining_time: number | null
					jit_optimization_count: number | null
					jit_optimization_time: number | null
					local_blk_read_time: number | null
					local_blk_write_time: number | null
					local_blks_dirtied: number | null
					local_blks_hit: number | null
					local_blks_read: number | null
					local_blks_written: number | null
					max_exec_time: number | null
					max_plan_time: number | null
					mean_exec_time: number | null
					mean_plan_time: number | null
					message: string | null
					min_exec_time: number | null
					min_plan_time: number | null
					minmax_stats_since: string | null
					pgsm_query_id: number | null
					planid: number | null
					plans: number | null
					query: string | null
					query_plan: string | null
					queryid: number | null
					relations: string[] | null
					resp_calls: string[] | null
					rows: number | null
					shared_blk_read_time: number | null
					shared_blk_write_time: number | null
					shared_blks_dirtied: number | null
					shared_blks_hit: number | null
					shared_blks_read: number | null
					shared_blks_written: number | null
					sqlcode: string | null
					stats_since: string | null
					stddev_exec_time: number | null
					stddev_plan_time: number | null
					temp_blk_read_time: number | null
					temp_blk_write_time: number | null
					temp_blks_read: number | null
					temp_blks_written: number | null
					top_query: string | null
					top_queryid: number | null
					toplevel: boolean | null
					total_exec_time: number | null
					total_plan_time: number | null
					userid: unknown
					username: string | null
					wal_bytes: number | null
					wal_fpi: number | null
					wal_records: number | null
				}
				Relationships: []
			}
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
			calculate_financial_metrics: {
				Args: { p_user_id: string }
				Returns: Json
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
			calculate_net_operating_income: {
				Args: { p_user_id: string }
				Returns: Json
			}
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
			custom_access_token_hook: { Args: { event: Json }; Returns: Json }
			decode_error_level: { Args: { elevel: number }; Returns: string }
			get_billing_insights: {
				Args: {
					end_date_param?: string
					owner_id_param: string
					start_date_param?: string
				}
				Returns: Json
			}
			get_cmd_type: { Args: { cmd_type: number }; Returns: string }
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
			get_current_tenant_id: { Args: never; Returns: string }
			get_current_user_type: { Args: never; Returns: string }
			get_dashboard_stats: {
				Args: { p_user_id: string }
				Returns: {
					leases: Database['public']['CompositeTypes']['lease_stats_type']
					maintenance: Database['public']['CompositeTypes']['maintenance_stats_type']
					properties: Database['public']['CompositeTypes']['property_stats_type']
					revenue: Database['public']['CompositeTypes']['revenue_stats_type']
					tenants: Database['public']['CompositeTypes']['tenant_stats_type']
					units: Database['public']['CompositeTypes']['unit_stats_type']
				}[]
			}
			get_dashboard_time_series: {
				Args: { p_days?: number; p_metric_name: string; p_user_id: string }
				Returns: {
					date: string
					value: number
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
			get_financial_overview: { Args: { p_user_id: string }; Returns: Json }
			get_histogram_timings: { Args: never; Returns: string }
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
			get_lease_financial_summary: {
				Args: { p_user_id: string }
				Returns: Json
			}
			get_leases_with_financial_analytics: {
				Args: { p_user_id: string }
				Returns: Json
			}
			get_maintenance_analytics: { Args: { user_id: string }; Returns: Json }
			get_metric_trend: {
				Args: { p_metric_name: string; p_period?: string; p_user_id: string }
				Returns: Json
			}
			get_occupancy_trends_optimized: {
				Args: { p_months?: number; p_user_id: string }
				Returns: Json
			}
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
			get_revenue_trends_optimized: {
				Args: { p_months?: number; p_user_id: string }
				Returns: Json
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
					unit_limit: number
					user_limit: number
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
			histogram: {
				Args: { _bucket: number; _quryid: number }
				Returns: Record<string, unknown>[]
			}
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
			parse_address: { Args: { '': string }; Returns: Record<string, unknown> }
			pg_stat_monitor_internal: {
				Args: { showtext: boolean }
				Returns: Record<string, unknown>[]
			}
			pg_stat_monitor_reset: { Args: never; Returns: undefined }
			pg_stat_monitor_version: { Args: never; Returns: string }
			pgsm_create_11_view: { Args: never; Returns: number }
			pgsm_create_13_view: { Args: never; Returns: number }
			pgsm_create_14_view: { Args: never; Returns: number }
			pgsm_create_15_view: { Args: never; Returns: number }
			pgsm_create_17_view: { Args: never; Returns: number }
			pgsm_create_view: { Args: never; Returns: number }
			range: { Args: never; Returns: string[] }
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
			show_limit: { Args: never; Returns: number }
			show_trgm: { Args: { '': string }; Returns: string[] }
			sign_lease_and_check_activation: {
				Args: {
					p_lease_id: string
					p_signature_ip: string
					p_signature_method?: Database['public']['Enums']['signature_method']
					p_signed_at: string
					p_signer_type: string
				}
				Returns: {
					both_signed: boolean
					error_message: string
					success: boolean
				}[]
			}
			standardize_address:
				| {
						Args: {
							address: string
							gaztab: string
							lextab: string
							rultab: string
						}
						Returns: Database['public']['CompositeTypes']['stdaddr']
						SetofOptions: {
							from: '*'
							to: 'stdaddr'
							isOneToOne: true
							isSetofReturn: false
						}
				  }
				| {
						Args: {
							gaztab: string
							lextab: string
							macro: string
							micro: string
							rultab: string
						}
						Returns: Database['public']['CompositeTypes']['stdaddr']
						SetofOptions: {
							from: '*'
							to: 'stdaddr'
							isOneToOne: true
							isSetofReturn: false
						}
				  }
			upsert_rent_payment: {
				Args: {
					p_amount: number
					p_application_fee_amount: number
					p_currency: string
					p_due_date: string
					p_lease_id: string
					p_paid_date: string
					p_payment_method_type: string
					p_period_end: string
					p_period_start: string
					p_status: string
					p_stripe_payment_intent_id: string
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
			invitation_type: 'platform_access' | 'lease_signing'
			lease_status:
				| 'draft'
				| 'pending_signature'
				| 'active'
				| 'ended'
				| 'terminated'
			maintenance_priority: 'low' | 'normal' | 'medium' | 'high' | 'urgent'
			maintenance_status:
				| 'open'
				| 'in_progress'
				| 'completed'
				| 'cancelled'
				| 'on_hold'
			notification_type: 'maintenance' | 'lease' | 'payment' | 'system'
			payment_status:
				| 'pending'
				| 'processing'
				| 'succeeded'
				| 'failed'
				| 'canceled'
				| 'cancelled'
				| 'requires_action'
			property_status: 'active' | 'inactive' | 'sold'
			security_event_severity:
				| 'debug'
				| 'info'
				| 'warning'
				| 'error'
				| 'critical'
			security_event_type:
				| 'auth.login'
				| 'auth.logout'
				| 'auth.failed_login'
				| 'auth.password_change'
				| 'auth.password_reset'
				| 'user.created'
				| 'user.updated'
				| 'user.deleted'
				| 'property.created'
				| 'property.updated'
				| 'property.deleted'
				| 'lease.created'
				| 'lease.updated'
				| 'lease.deleted'
				| 'lease.signed'
				| 'payment.created'
				| 'payment.failed'
				| 'subscription.created'
				| 'subscription.canceled'
				| 'admin.action'
				| 'system.error'
				| 'system.warning'
			signature_method: 'in_app' | 'docuseal'
			stripe_subscription_status: 'none' | 'pending' | 'active' | 'failed'
			unit_status: 'available' | 'occupied' | 'maintenance' | 'reserved'
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
					| Database['public']['CompositeTypes']['maintenance_priority_type']
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
			stdaddr: {
				building: string | null
				house_num: string | null
				predir: string | null
				qual: string | null
				pretype: string | null
				name: string | null
				suftype: string | null
				sufdir: string | null
				ruralroute: string | null
				extra: string | null
				city: string | null
				state: string | null
				country: string | null
				postcode: string | null
				box: string | null
				unit: string | null
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
	stripe: {
		Tables: {
			active_entitlements: {
				Row: {
					customer: string | null
					feature: string | null
					id: string
					last_synced_at: string | null
					livemode: boolean | null
					lookup_key: string | null
					object: string | null
					updated_at: string
				}
				Insert: {
					customer?: string | null
					feature?: string | null
					id: string
					last_synced_at?: string | null
					livemode?: boolean | null
					lookup_key?: string | null
					object?: string | null
					updated_at?: string
				}
				Update: {
					customer?: string | null
					feature?: string | null
					id?: string
					last_synced_at?: string | null
					livemode?: boolean | null
					lookup_key?: string | null
					object?: string | null
					updated_at?: string
				}
				Relationships: []
			}
			charges: {
				Row: {
					amount: number | null
					amount_refunded: number | null
					application: string | null
					application_fee: string | null
					balance_transaction: string | null
					captured: boolean | null
					created: number | null
					currency: string | null
					customer: string | null
					description: string | null
					destination: string | null
					dispute: string | null
					failure_code: string | null
					failure_message: string | null
					fraud_details: Json | null
					id: string
					invoice: string | null
					last_synced_at: string | null
					livemode: boolean | null
					metadata: Json | null
					object: string | null
					on_behalf_of: string | null
					order: string | null
					outcome: Json | null
					paid: boolean | null
					payment_intent: string | null
					payment_method_details: Json | null
					receipt_email: string | null
					receipt_number: string | null
					refunded: boolean | null
					refunds: Json | null
					review: string | null
					shipping: Json | null
					source: Json | null
					source_transfer: string | null
					statement_descriptor: string | null
					status: string | null
					transfer_group: string | null
					updated: number | null
					updated_at: string
				}
				Insert: {
					amount?: number | null
					amount_refunded?: number | null
					application?: string | null
					application_fee?: string | null
					balance_transaction?: string | null
					captured?: boolean | null
					created?: number | null
					currency?: string | null
					customer?: string | null
					description?: string | null
					destination?: string | null
					dispute?: string | null
					failure_code?: string | null
					failure_message?: string | null
					fraud_details?: Json | null
					id: string
					invoice?: string | null
					last_synced_at?: string | null
					livemode?: boolean | null
					metadata?: Json | null
					object?: string | null
					on_behalf_of?: string | null
					order?: string | null
					outcome?: Json | null
					paid?: boolean | null
					payment_intent?: string | null
					payment_method_details?: Json | null
					receipt_email?: string | null
					receipt_number?: string | null
					refunded?: boolean | null
					refunds?: Json | null
					review?: string | null
					shipping?: Json | null
					source?: Json | null
					source_transfer?: string | null
					statement_descriptor?: string | null
					status?: string | null
					transfer_group?: string | null
					updated?: number | null
					updated_at?: string
				}
				Update: {
					amount?: number | null
					amount_refunded?: number | null
					application?: string | null
					application_fee?: string | null
					balance_transaction?: string | null
					captured?: boolean | null
					created?: number | null
					currency?: string | null
					customer?: string | null
					description?: string | null
					destination?: string | null
					dispute?: string | null
					failure_code?: string | null
					failure_message?: string | null
					fraud_details?: Json | null
					id?: string
					invoice?: string | null
					last_synced_at?: string | null
					livemode?: boolean | null
					metadata?: Json | null
					object?: string | null
					on_behalf_of?: string | null
					order?: string | null
					outcome?: Json | null
					paid?: boolean | null
					payment_intent?: string | null
					payment_method_details?: Json | null
					receipt_email?: string | null
					receipt_number?: string | null
					refunded?: boolean | null
					refunds?: Json | null
					review?: string | null
					shipping?: Json | null
					source?: Json | null
					source_transfer?: string | null
					statement_descriptor?: string | null
					status?: string | null
					transfer_group?: string | null
					updated?: number | null
					updated_at?: string
				}
				Relationships: []
			}
			checkout_session_line_items: {
				Row: {
					amount_discount: number | null
					amount_subtotal: number | null
					amount_tax: number | null
					amount_total: number | null
					checkout_session: string | null
					currency: string | null
					description: string | null
					id: string
					last_synced_at: string | null
					object: string | null
					price: string | null
					quantity: number | null
					updated_at: string
				}
				Insert: {
					amount_discount?: number | null
					amount_subtotal?: number | null
					amount_tax?: number | null
					amount_total?: number | null
					checkout_session?: string | null
					currency?: string | null
					description?: string | null
					id: string
					last_synced_at?: string | null
					object?: string | null
					price?: string | null
					quantity?: number | null
					updated_at?: string
				}
				Update: {
					amount_discount?: number | null
					amount_subtotal?: number | null
					amount_tax?: number | null
					amount_total?: number | null
					checkout_session?: string | null
					currency?: string | null
					description?: string | null
					id?: string
					last_synced_at?: string | null
					object?: string | null
					price?: string | null
					quantity?: number | null
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'checkout_session_line_items_checkout_session_fkey'
						columns: ['checkout_session']
						isOneToOne: false
						referencedRelation: 'checkout_sessions'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'checkout_session_line_items_price_fkey'
						columns: ['price']
						isOneToOne: false
						referencedRelation: 'prices'
						referencedColumns: ['id']
					}
				]
			}
			checkout_sessions: {
				Row: {
					adaptive_pricing: Json | null
					after_expiration: Json | null
					allow_promotion_codes: boolean | null
					amount_subtotal: number | null
					amount_total: number | null
					automatic_tax: Json | null
					billing_address_collection: string | null
					cancel_url: string | null
					client_reference_id: string | null
					client_secret: string | null
					collected_information: Json | null
					consent: Json | null
					consent_collection: Json | null
					created: number | null
					currency: string | null
					currency_conversion: Json | null
					custom_fields: Json | null
					custom_text: Json | null
					customer: string | null
					customer_creation: string | null
					customer_details: Json | null
					customer_email: string | null
					discounts: Json | null
					expires_at: number | null
					id: string
					invoice: string | null
					invoice_creation: Json | null
					last_synced_at: string | null
					livemode: boolean | null
					locale: string | null
					metadata: Json | null
					mode: string | null
					object: string | null
					optional_items: Json | null
					payment_intent: string | null
					payment_link: string | null
					payment_method_collection: string | null
					payment_method_configuration_details: Json | null
					payment_method_options: Json | null
					payment_method_types: Json | null
					payment_status: string | null
					permissions: Json | null
					phone_number_collection: Json | null
					presentment_details: Json | null
					recovered_from: string | null
					redirect_on_completion: string | null
					return_url: string | null
					saved_payment_method_options: Json | null
					setup_intent: string | null
					shipping_address_collection: Json | null
					shipping_cost: Json | null
					shipping_details: Json | null
					shipping_options: Json | null
					status: string | null
					submit_type: string | null
					subscription: string | null
					success_url: string | null
					tax_id_collection: Json | null
					total_details: Json | null
					ui_mode: string | null
					updated_at: string
					url: string | null
					wallet_options: Json | null
				}
				Insert: {
					adaptive_pricing?: Json | null
					after_expiration?: Json | null
					allow_promotion_codes?: boolean | null
					amount_subtotal?: number | null
					amount_total?: number | null
					automatic_tax?: Json | null
					billing_address_collection?: string | null
					cancel_url?: string | null
					client_reference_id?: string | null
					client_secret?: string | null
					collected_information?: Json | null
					consent?: Json | null
					consent_collection?: Json | null
					created?: number | null
					currency?: string | null
					currency_conversion?: Json | null
					custom_fields?: Json | null
					custom_text?: Json | null
					customer?: string | null
					customer_creation?: string | null
					customer_details?: Json | null
					customer_email?: string | null
					discounts?: Json | null
					expires_at?: number | null
					id: string
					invoice?: string | null
					invoice_creation?: Json | null
					last_synced_at?: string | null
					livemode?: boolean | null
					locale?: string | null
					metadata?: Json | null
					mode?: string | null
					object?: string | null
					optional_items?: Json | null
					payment_intent?: string | null
					payment_link?: string | null
					payment_method_collection?: string | null
					payment_method_configuration_details?: Json | null
					payment_method_options?: Json | null
					payment_method_types?: Json | null
					payment_status?: string | null
					permissions?: Json | null
					phone_number_collection?: Json | null
					presentment_details?: Json | null
					recovered_from?: string | null
					redirect_on_completion?: string | null
					return_url?: string | null
					saved_payment_method_options?: Json | null
					setup_intent?: string | null
					shipping_address_collection?: Json | null
					shipping_cost?: Json | null
					shipping_details?: Json | null
					shipping_options?: Json | null
					status?: string | null
					submit_type?: string | null
					subscription?: string | null
					success_url?: string | null
					tax_id_collection?: Json | null
					total_details?: Json | null
					ui_mode?: string | null
					updated_at?: string
					url?: string | null
					wallet_options?: Json | null
				}
				Update: {
					adaptive_pricing?: Json | null
					after_expiration?: Json | null
					allow_promotion_codes?: boolean | null
					amount_subtotal?: number | null
					amount_total?: number | null
					automatic_tax?: Json | null
					billing_address_collection?: string | null
					cancel_url?: string | null
					client_reference_id?: string | null
					client_secret?: string | null
					collected_information?: Json | null
					consent?: Json | null
					consent_collection?: Json | null
					created?: number | null
					currency?: string | null
					currency_conversion?: Json | null
					custom_fields?: Json | null
					custom_text?: Json | null
					customer?: string | null
					customer_creation?: string | null
					customer_details?: Json | null
					customer_email?: string | null
					discounts?: Json | null
					expires_at?: number | null
					id?: string
					invoice?: string | null
					invoice_creation?: Json | null
					last_synced_at?: string | null
					livemode?: boolean | null
					locale?: string | null
					metadata?: Json | null
					mode?: string | null
					object?: string | null
					optional_items?: Json | null
					payment_intent?: string | null
					payment_link?: string | null
					payment_method_collection?: string | null
					payment_method_configuration_details?: Json | null
					payment_method_options?: Json | null
					payment_method_types?: Json | null
					payment_status?: string | null
					permissions?: Json | null
					phone_number_collection?: Json | null
					presentment_details?: Json | null
					recovered_from?: string | null
					redirect_on_completion?: string | null
					return_url?: string | null
					saved_payment_method_options?: Json | null
					setup_intent?: string | null
					shipping_address_collection?: Json | null
					shipping_cost?: Json | null
					shipping_details?: Json | null
					shipping_options?: Json | null
					status?: string | null
					submit_type?: string | null
					subscription?: string | null
					success_url?: string | null
					tax_id_collection?: Json | null
					total_details?: Json | null
					ui_mode?: string | null
					updated_at?: string
					url?: string | null
					wallet_options?: Json | null
				}
				Relationships: []
			}
			coupons: {
				Row: {
					amount_off: number | null
					created: number | null
					currency: string | null
					duration: string | null
					duration_in_months: number | null
					id: string
					last_synced_at: string | null
					livemode: boolean | null
					max_redemptions: number | null
					metadata: Json | null
					name: string | null
					object: string | null
					percent_off: number | null
					percent_off_precise: number | null
					redeem_by: number | null
					times_redeemed: number | null
					updated: number | null
					updated_at: string
					valid: boolean | null
				}
				Insert: {
					amount_off?: number | null
					created?: number | null
					currency?: string | null
					duration?: string | null
					duration_in_months?: number | null
					id: string
					last_synced_at?: string | null
					livemode?: boolean | null
					max_redemptions?: number | null
					metadata?: Json | null
					name?: string | null
					object?: string | null
					percent_off?: number | null
					percent_off_precise?: number | null
					redeem_by?: number | null
					times_redeemed?: number | null
					updated?: number | null
					updated_at?: string
					valid?: boolean | null
				}
				Update: {
					amount_off?: number | null
					created?: number | null
					currency?: string | null
					duration?: string | null
					duration_in_months?: number | null
					id?: string
					last_synced_at?: string | null
					livemode?: boolean | null
					max_redemptions?: number | null
					metadata?: Json | null
					name?: string | null
					object?: string | null
					percent_off?: number | null
					percent_off_precise?: number | null
					redeem_by?: number | null
					times_redeemed?: number | null
					updated?: number | null
					updated_at?: string
					valid?: boolean | null
				}
				Relationships: []
			}
			credit_notes: {
				Row: {
					amount: number | null
					amount_shipping: number | null
					created: number | null
					currency: string | null
					customer: string | null
					customer_balance_transaction: string | null
					discount_amount: number | null
					discount_amounts: Json | null
					id: string
					invoice: string | null
					last_synced_at: string | null
					lines: Json | null
					livemode: boolean | null
					memo: string | null
					metadata: Json | null
					number: string | null
					object: string | null
					out_of_band_amount: number | null
					pdf: string | null
					reason: string | null
					refund: string | null
					shipping_cost: Json | null
					status: string | null
					subtotal: number | null
					subtotal_excluding_tax: number | null
					tax_amounts: Json | null
					total: number | null
					total_excluding_tax: number | null
					type: string | null
					voided_at: string | null
				}
				Insert: {
					amount?: number | null
					amount_shipping?: number | null
					created?: number | null
					currency?: string | null
					customer?: string | null
					customer_balance_transaction?: string | null
					discount_amount?: number | null
					discount_amounts?: Json | null
					id: string
					invoice?: string | null
					last_synced_at?: string | null
					lines?: Json | null
					livemode?: boolean | null
					memo?: string | null
					metadata?: Json | null
					number?: string | null
					object?: string | null
					out_of_band_amount?: number | null
					pdf?: string | null
					reason?: string | null
					refund?: string | null
					shipping_cost?: Json | null
					status?: string | null
					subtotal?: number | null
					subtotal_excluding_tax?: number | null
					tax_amounts?: Json | null
					total?: number | null
					total_excluding_tax?: number | null
					type?: string | null
					voided_at?: string | null
				}
				Update: {
					amount?: number | null
					amount_shipping?: number | null
					created?: number | null
					currency?: string | null
					customer?: string | null
					customer_balance_transaction?: string | null
					discount_amount?: number | null
					discount_amounts?: Json | null
					id?: string
					invoice?: string | null
					last_synced_at?: string | null
					lines?: Json | null
					livemode?: boolean | null
					memo?: string | null
					metadata?: Json | null
					number?: string | null
					object?: string | null
					out_of_band_amount?: number | null
					pdf?: string | null
					reason?: string | null
					refund?: string | null
					shipping_cost?: Json | null
					status?: string | null
					subtotal?: number | null
					subtotal_excluding_tax?: number | null
					tax_amounts?: Json | null
					total?: number | null
					total_excluding_tax?: number | null
					type?: string | null
					voided_at?: string | null
				}
				Relationships: []
			}
			customers: {
				Row: {
					address: Json | null
					balance: number | null
					created: number | null
					currency: string | null
					default_source: string | null
					deleted: boolean
					delinquent: boolean | null
					description: string | null
					discount: Json | null
					email: string | null
					id: string
					invoice_prefix: string | null
					invoice_settings: Json | null
					last_synced_at: string | null
					livemode: boolean | null
					metadata: Json | null
					name: string | null
					next_invoice_sequence: number | null
					object: string | null
					phone: string | null
					preferred_locales: Json | null
					shipping: Json | null
					tax_exempt: string | null
					updated_at: string
				}
				Insert: {
					address?: Json | null
					balance?: number | null
					created?: number | null
					currency?: string | null
					default_source?: string | null
					deleted?: boolean
					delinquent?: boolean | null
					description?: string | null
					discount?: Json | null
					email?: string | null
					id: string
					invoice_prefix?: string | null
					invoice_settings?: Json | null
					last_synced_at?: string | null
					livemode?: boolean | null
					metadata?: Json | null
					name?: string | null
					next_invoice_sequence?: number | null
					object?: string | null
					phone?: string | null
					preferred_locales?: Json | null
					shipping?: Json | null
					tax_exempt?: string | null
					updated_at?: string
				}
				Update: {
					address?: Json | null
					balance?: number | null
					created?: number | null
					currency?: string | null
					default_source?: string | null
					deleted?: boolean
					delinquent?: boolean | null
					description?: string | null
					discount?: Json | null
					email?: string | null
					id?: string
					invoice_prefix?: string | null
					invoice_settings?: Json | null
					last_synced_at?: string | null
					livemode?: boolean | null
					metadata?: Json | null
					name?: string | null
					next_invoice_sequence?: number | null
					object?: string | null
					phone?: string | null
					preferred_locales?: Json | null
					shipping?: Json | null
					tax_exempt?: string | null
					updated_at?: string
				}
				Relationships: []
			}
			disputes: {
				Row: {
					amount: number | null
					balance_transactions: Json | null
					charge: string | null
					created: number | null
					currency: string | null
					evidence: Json | null
					evidence_details: Json | null
					id: string
					is_charge_refundable: boolean | null
					last_synced_at: string | null
					livemode: boolean | null
					metadata: Json | null
					object: string | null
					payment_intent: string | null
					reason: string | null
					status: string | null
					updated: number | null
					updated_at: string
				}
				Insert: {
					amount?: number | null
					balance_transactions?: Json | null
					charge?: string | null
					created?: number | null
					currency?: string | null
					evidence?: Json | null
					evidence_details?: Json | null
					id: string
					is_charge_refundable?: boolean | null
					last_synced_at?: string | null
					livemode?: boolean | null
					metadata?: Json | null
					object?: string | null
					payment_intent?: string | null
					reason?: string | null
					status?: string | null
					updated?: number | null
					updated_at?: string
				}
				Update: {
					amount?: number | null
					balance_transactions?: Json | null
					charge?: string | null
					created?: number | null
					currency?: string | null
					evidence?: Json | null
					evidence_details?: Json | null
					id?: string
					is_charge_refundable?: boolean | null
					last_synced_at?: string | null
					livemode?: boolean | null
					metadata?: Json | null
					object?: string | null
					payment_intent?: string | null
					reason?: string | null
					status?: string | null
					updated?: number | null
					updated_at?: string
				}
				Relationships: []
			}
			early_fraud_warnings: {
				Row: {
					actionable: boolean | null
					charge: string | null
					created: number | null
					fraud_type: string | null
					id: string
					last_synced_at: string | null
					livemode: boolean | null
					object: string | null
					payment_intent: string | null
					updated_at: string
				}
				Insert: {
					actionable?: boolean | null
					charge?: string | null
					created?: number | null
					fraud_type?: string | null
					id: string
					last_synced_at?: string | null
					livemode?: boolean | null
					object?: string | null
					payment_intent?: string | null
					updated_at?: string
				}
				Update: {
					actionable?: boolean | null
					charge?: string | null
					created?: number | null
					fraud_type?: string | null
					id?: string
					last_synced_at?: string | null
					livemode?: boolean | null
					object?: string | null
					payment_intent?: string | null
					updated_at?: string
				}
				Relationships: []
			}
			events: {
				Row: {
					api_version: string | null
					created: number | null
					data: Json | null
					id: string
					last_synced_at: string | null
					livemode: boolean | null
					object: string | null
					pending_webhooks: number | null
					request: string | null
					type: string | null
					updated: number | null
					updated_at: string
				}
				Insert: {
					api_version?: string | null
					created?: number | null
					data?: Json | null
					id: string
					last_synced_at?: string | null
					livemode?: boolean | null
					object?: string | null
					pending_webhooks?: number | null
					request?: string | null
					type?: string | null
					updated?: number | null
					updated_at?: string
				}
				Update: {
					api_version?: string | null
					created?: number | null
					data?: Json | null
					id?: string
					last_synced_at?: string | null
					livemode?: boolean | null
					object?: string | null
					pending_webhooks?: number | null
					request?: string | null
					type?: string | null
					updated?: number | null
					updated_at?: string
				}
				Relationships: []
			}
			features: {
				Row: {
					active: boolean | null
					id: string
					last_synced_at: string | null
					livemode: boolean | null
					lookup_key: string | null
					metadata: Json | null
					name: string | null
					object: string | null
					updated_at: string
				}
				Insert: {
					active?: boolean | null
					id: string
					last_synced_at?: string | null
					livemode?: boolean | null
					lookup_key?: string | null
					metadata?: Json | null
					name?: string | null
					object?: string | null
					updated_at?: string
				}
				Update: {
					active?: boolean | null
					id?: string
					last_synced_at?: string | null
					livemode?: boolean | null
					lookup_key?: string | null
					metadata?: Json | null
					name?: string | null
					object?: string | null
					updated_at?: string
				}
				Relationships: []
			}
			invoices: {
				Row: {
					account_country: string | null
					account_name: string | null
					account_tax_ids: Json | null
					amount_due: number | null
					amount_paid: number | null
					amount_remaining: number | null
					application_fee_amount: number | null
					attempt_count: number | null
					attempted: boolean | null
					auto_advance: boolean | null
					billing_reason: string | null
					charge: string | null
					collection_method: string | null
					created: number | null
					currency: string | null
					custom_fields: Json | null
					customer: string | null
					customer_address: Json | null
					customer_email: string | null
					customer_name: string | null
					customer_phone: string | null
					customer_shipping: Json | null
					customer_tax_exempt: string | null
					customer_tax_ids: Json | null
					default_payment_method: string | null
					default_source: string | null
					default_tax_rates: Json | null
					description: string | null
					discount: Json | null
					discounts: Json | null
					due_date: number | null
					ending_balance: number | null
					footer: string | null
					hosted_invoice_url: string | null
					id: string
					invoice_pdf: string | null
					last_finalization_error: Json | null
					last_synced_at: string | null
					lines: Json | null
					livemode: boolean | null
					metadata: Json | null
					next_payment_attempt: number | null
					number: string | null
					object: string | null
					on_behalf_of: string | null
					paid: boolean | null
					payment_intent: string | null
					payment_settings: Json | null
					period_end: number | null
					period_start: number | null
					post_payment_credit_notes_amount: number | null
					pre_payment_credit_notes_amount: number | null
					receipt_number: string | null
					starting_balance: number | null
					statement_descriptor: string | null
					status: Database['stripe']['Enums']['invoice_status'] | null
					status_transitions: Json | null
					subscription: string | null
					subtotal: number | null
					tax: number | null
					total: number | null
					total_discount_amounts: Json | null
					total_tax_amounts: Json | null
					transfer_data: Json | null
					updated_at: string
					webhooks_delivered_at: number | null
				}
				Insert: {
					account_country?: string | null
					account_name?: string | null
					account_tax_ids?: Json | null
					amount_due?: number | null
					amount_paid?: number | null
					amount_remaining?: number | null
					application_fee_amount?: number | null
					attempt_count?: number | null
					attempted?: boolean | null
					auto_advance?: boolean | null
					billing_reason?: string | null
					charge?: string | null
					collection_method?: string | null
					created?: number | null
					currency?: string | null
					custom_fields?: Json | null
					customer?: string | null
					customer_address?: Json | null
					customer_email?: string | null
					customer_name?: string | null
					customer_phone?: string | null
					customer_shipping?: Json | null
					customer_tax_exempt?: string | null
					customer_tax_ids?: Json | null
					default_payment_method?: string | null
					default_source?: string | null
					default_tax_rates?: Json | null
					description?: string | null
					discount?: Json | null
					discounts?: Json | null
					due_date?: number | null
					ending_balance?: number | null
					footer?: string | null
					hosted_invoice_url?: string | null
					id: string
					invoice_pdf?: string | null
					last_finalization_error?: Json | null
					last_synced_at?: string | null
					lines?: Json | null
					livemode?: boolean | null
					metadata?: Json | null
					next_payment_attempt?: number | null
					number?: string | null
					object?: string | null
					on_behalf_of?: string | null
					paid?: boolean | null
					payment_intent?: string | null
					payment_settings?: Json | null
					period_end?: number | null
					period_start?: number | null
					post_payment_credit_notes_amount?: number | null
					pre_payment_credit_notes_amount?: number | null
					receipt_number?: string | null
					starting_balance?: number | null
					statement_descriptor?: string | null
					status?: Database['stripe']['Enums']['invoice_status'] | null
					status_transitions?: Json | null
					subscription?: string | null
					subtotal?: number | null
					tax?: number | null
					total?: number | null
					total_discount_amounts?: Json | null
					total_tax_amounts?: Json | null
					transfer_data?: Json | null
					updated_at?: string
					webhooks_delivered_at?: number | null
				}
				Update: {
					account_country?: string | null
					account_name?: string | null
					account_tax_ids?: Json | null
					amount_due?: number | null
					amount_paid?: number | null
					amount_remaining?: number | null
					application_fee_amount?: number | null
					attempt_count?: number | null
					attempted?: boolean | null
					auto_advance?: boolean | null
					billing_reason?: string | null
					charge?: string | null
					collection_method?: string | null
					created?: number | null
					currency?: string | null
					custom_fields?: Json | null
					customer?: string | null
					customer_address?: Json | null
					customer_email?: string | null
					customer_name?: string | null
					customer_phone?: string | null
					customer_shipping?: Json | null
					customer_tax_exempt?: string | null
					customer_tax_ids?: Json | null
					default_payment_method?: string | null
					default_source?: string | null
					default_tax_rates?: Json | null
					description?: string | null
					discount?: Json | null
					discounts?: Json | null
					due_date?: number | null
					ending_balance?: number | null
					footer?: string | null
					hosted_invoice_url?: string | null
					id?: string
					invoice_pdf?: string | null
					last_finalization_error?: Json | null
					last_synced_at?: string | null
					lines?: Json | null
					livemode?: boolean | null
					metadata?: Json | null
					next_payment_attempt?: number | null
					number?: string | null
					object?: string | null
					on_behalf_of?: string | null
					paid?: boolean | null
					payment_intent?: string | null
					payment_settings?: Json | null
					period_end?: number | null
					period_start?: number | null
					post_payment_credit_notes_amount?: number | null
					pre_payment_credit_notes_amount?: number | null
					receipt_number?: string | null
					starting_balance?: number | null
					statement_descriptor?: string | null
					status?: Database['stripe']['Enums']['invoice_status'] | null
					status_transitions?: Json | null
					subscription?: string | null
					subtotal?: number | null
					tax?: number | null
					total?: number | null
					total_discount_amounts?: Json | null
					total_tax_amounts?: Json | null
					transfer_data?: Json | null
					updated_at?: string
					webhooks_delivered_at?: number | null
				}
				Relationships: []
			}
			migrations: {
				Row: {
					executed_at: string | null
					hash: string
					id: number
					name: string
				}
				Insert: {
					executed_at?: string | null
					hash: string
					id: number
					name: string
				}
				Update: {
					executed_at?: string | null
					hash?: string
					id?: number
					name?: string
				}
				Relationships: []
			}
			payment_intents: {
				Row: {
					amount: number | null
					amount_capturable: number | null
					amount_details: Json | null
					amount_received: number | null
					application: string | null
					application_fee_amount: number | null
					automatic_payment_methods: string | null
					canceled_at: number | null
					cancellation_reason: string | null
					capture_method: string | null
					client_secret: string | null
					confirmation_method: string | null
					created: number | null
					currency: string | null
					customer: string | null
					description: string | null
					id: string
					invoice: string | null
					last_payment_error: string | null
					last_synced_at: string | null
					livemode: boolean | null
					metadata: Json | null
					next_action: string | null
					object: string | null
					on_behalf_of: string | null
					payment_method: string | null
					payment_method_options: Json | null
					payment_method_types: Json | null
					processing: string | null
					receipt_email: string | null
					review: string | null
					setup_future_usage: string | null
					shipping: Json | null
					statement_descriptor: string | null
					statement_descriptor_suffix: string | null
					status: string | null
					transfer_data: Json | null
					transfer_group: string | null
				}
				Insert: {
					amount?: number | null
					amount_capturable?: number | null
					amount_details?: Json | null
					amount_received?: number | null
					application?: string | null
					application_fee_amount?: number | null
					automatic_payment_methods?: string | null
					canceled_at?: number | null
					cancellation_reason?: string | null
					capture_method?: string | null
					client_secret?: string | null
					confirmation_method?: string | null
					created?: number | null
					currency?: string | null
					customer?: string | null
					description?: string | null
					id: string
					invoice?: string | null
					last_payment_error?: string | null
					last_synced_at?: string | null
					livemode?: boolean | null
					metadata?: Json | null
					next_action?: string | null
					object?: string | null
					on_behalf_of?: string | null
					payment_method?: string | null
					payment_method_options?: Json | null
					payment_method_types?: Json | null
					processing?: string | null
					receipt_email?: string | null
					review?: string | null
					setup_future_usage?: string | null
					shipping?: Json | null
					statement_descriptor?: string | null
					statement_descriptor_suffix?: string | null
					status?: string | null
					transfer_data?: Json | null
					transfer_group?: string | null
				}
				Update: {
					amount?: number | null
					amount_capturable?: number | null
					amount_details?: Json | null
					amount_received?: number | null
					application?: string | null
					application_fee_amount?: number | null
					automatic_payment_methods?: string | null
					canceled_at?: number | null
					cancellation_reason?: string | null
					capture_method?: string | null
					client_secret?: string | null
					confirmation_method?: string | null
					created?: number | null
					currency?: string | null
					customer?: string | null
					description?: string | null
					id?: string
					invoice?: string | null
					last_payment_error?: string | null
					last_synced_at?: string | null
					livemode?: boolean | null
					metadata?: Json | null
					next_action?: string | null
					object?: string | null
					on_behalf_of?: string | null
					payment_method?: string | null
					payment_method_options?: Json | null
					payment_method_types?: Json | null
					processing?: string | null
					receipt_email?: string | null
					review?: string | null
					setup_future_usage?: string | null
					shipping?: Json | null
					statement_descriptor?: string | null
					statement_descriptor_suffix?: string | null
					status?: string | null
					transfer_data?: Json | null
					transfer_group?: string | null
				}
				Relationships: []
			}
			payment_methods: {
				Row: {
					billing_details: Json | null
					card: Json | null
					created: number | null
					customer: string | null
					id: string
					last_synced_at: string | null
					metadata: Json | null
					object: string | null
					type: string | null
				}
				Insert: {
					billing_details?: Json | null
					card?: Json | null
					created?: number | null
					customer?: string | null
					id: string
					last_synced_at?: string | null
					metadata?: Json | null
					object?: string | null
					type?: string | null
				}
				Update: {
					billing_details?: Json | null
					card?: Json | null
					created?: number | null
					customer?: string | null
					id?: string
					last_synced_at?: string | null
					metadata?: Json | null
					object?: string | null
					type?: string | null
				}
				Relationships: []
			}
			payouts: {
				Row: {
					amount: number | null
					amount_reversed: number | null
					arrival_date: string | null
					automatic: boolean | null
					balance_transaction: string | null
					bank_account: Json | null
					created: number | null
					currency: string | null
					date: string | null
					description: string | null
					destination: string | null
					failure_balance_transaction: string | null
					failure_code: string | null
					failure_message: string | null
					id: string
					last_synced_at: string | null
					livemode: boolean | null
					metadata: Json | null
					method: string | null
					object: string | null
					recipient: string | null
					source_transaction: string | null
					source_type: string | null
					statement_description: string | null
					statement_descriptor: string | null
					status: string | null
					transfer_group: string | null
					type: string | null
					updated: number | null
					updated_at: string
				}
				Insert: {
					amount?: number | null
					amount_reversed?: number | null
					arrival_date?: string | null
					automatic?: boolean | null
					balance_transaction?: string | null
					bank_account?: Json | null
					created?: number | null
					currency?: string | null
					date?: string | null
					description?: string | null
					destination?: string | null
					failure_balance_transaction?: string | null
					failure_code?: string | null
					failure_message?: string | null
					id: string
					last_synced_at?: string | null
					livemode?: boolean | null
					metadata?: Json | null
					method?: string | null
					object?: string | null
					recipient?: string | null
					source_transaction?: string | null
					source_type?: string | null
					statement_description?: string | null
					statement_descriptor?: string | null
					status?: string | null
					transfer_group?: string | null
					type?: string | null
					updated?: number | null
					updated_at?: string
				}
				Update: {
					amount?: number | null
					amount_reversed?: number | null
					arrival_date?: string | null
					automatic?: boolean | null
					balance_transaction?: string | null
					bank_account?: Json | null
					created?: number | null
					currency?: string | null
					date?: string | null
					description?: string | null
					destination?: string | null
					failure_balance_transaction?: string | null
					failure_code?: string | null
					failure_message?: string | null
					id?: string
					last_synced_at?: string | null
					livemode?: boolean | null
					metadata?: Json | null
					method?: string | null
					object?: string | null
					recipient?: string | null
					source_transaction?: string | null
					source_type?: string | null
					statement_description?: string | null
					statement_descriptor?: string | null
					status?: string | null
					transfer_group?: string | null
					type?: string | null
					updated?: number | null
					updated_at?: string
				}
				Relationships: []
			}
			plans: {
				Row: {
					active: boolean | null
					aggregate_usage: string | null
					amount: number | null
					billing_scheme: string | null
					created: number | null
					currency: string | null
					id: string
					interval: string | null
					interval_count: number | null
					last_synced_at: string | null
					livemode: boolean | null
					metadata: Json | null
					nickname: string | null
					object: string | null
					product: string | null
					tiers_mode: string | null
					transform_usage: string | null
					trial_period_days: number | null
					updated_at: string
					usage_type: string | null
				}
				Insert: {
					active?: boolean | null
					aggregate_usage?: string | null
					amount?: number | null
					billing_scheme?: string | null
					created?: number | null
					currency?: string | null
					id: string
					interval?: string | null
					interval_count?: number | null
					last_synced_at?: string | null
					livemode?: boolean | null
					metadata?: Json | null
					nickname?: string | null
					object?: string | null
					product?: string | null
					tiers_mode?: string | null
					transform_usage?: string | null
					trial_period_days?: number | null
					updated_at?: string
					usage_type?: string | null
				}
				Update: {
					active?: boolean | null
					aggregate_usage?: string | null
					amount?: number | null
					billing_scheme?: string | null
					created?: number | null
					currency?: string | null
					id?: string
					interval?: string | null
					interval_count?: number | null
					last_synced_at?: string | null
					livemode?: boolean | null
					metadata?: Json | null
					nickname?: string | null
					object?: string | null
					product?: string | null
					tiers_mode?: string | null
					transform_usage?: string | null
					trial_period_days?: number | null
					updated_at?: string
					usage_type?: string | null
				}
				Relationships: []
			}
			prices: {
				Row: {
					active: boolean | null
					billing_scheme: string | null
					created: number | null
					currency: string | null
					id: string
					last_synced_at: string | null
					livemode: boolean | null
					lookup_key: string | null
					metadata: Json | null
					nickname: string | null
					object: string | null
					product: string | null
					recurring: Json | null
					tiers_mode: Database['stripe']['Enums']['pricing_tiers'] | null
					transform_quantity: Json | null
					type: Database['stripe']['Enums']['pricing_type'] | null
					unit_amount: number | null
					unit_amount_decimal: string | null
					updated_at: string
				}
				Insert: {
					active?: boolean | null
					billing_scheme?: string | null
					created?: number | null
					currency?: string | null
					id: string
					last_synced_at?: string | null
					livemode?: boolean | null
					lookup_key?: string | null
					metadata?: Json | null
					nickname?: string | null
					object?: string | null
					product?: string | null
					recurring?: Json | null
					tiers_mode?: Database['stripe']['Enums']['pricing_tiers'] | null
					transform_quantity?: Json | null
					type?: Database['stripe']['Enums']['pricing_type'] | null
					unit_amount?: number | null
					unit_amount_decimal?: string | null
					updated_at?: string
				}
				Update: {
					active?: boolean | null
					billing_scheme?: string | null
					created?: number | null
					currency?: string | null
					id?: string
					last_synced_at?: string | null
					livemode?: boolean | null
					lookup_key?: string | null
					metadata?: Json | null
					nickname?: string | null
					object?: string | null
					product?: string | null
					recurring?: Json | null
					tiers_mode?: Database['stripe']['Enums']['pricing_tiers'] | null
					transform_quantity?: Json | null
					type?: Database['stripe']['Enums']['pricing_type'] | null
					unit_amount?: number | null
					unit_amount_decimal?: string | null
					updated_at?: string
				}
				Relationships: []
			}
			products: {
				Row: {
					active: boolean | null
					created: number | null
					default_price: string | null
					description: string | null
					id: string
					images: Json | null
					last_synced_at: string | null
					livemode: boolean | null
					marketing_features: Json | null
					metadata: Json | null
					name: string | null
					object: string | null
					package_dimensions: Json | null
					shippable: boolean | null
					statement_descriptor: string | null
					unit_label: string | null
					updated: number | null
					updated_at: string
					url: string | null
				}
				Insert: {
					active?: boolean | null
					created?: number | null
					default_price?: string | null
					description?: string | null
					id: string
					images?: Json | null
					last_synced_at?: string | null
					livemode?: boolean | null
					marketing_features?: Json | null
					metadata?: Json | null
					name?: string | null
					object?: string | null
					package_dimensions?: Json | null
					shippable?: boolean | null
					statement_descriptor?: string | null
					unit_label?: string | null
					updated?: number | null
					updated_at?: string
					url?: string | null
				}
				Update: {
					active?: boolean | null
					created?: number | null
					default_price?: string | null
					description?: string | null
					id?: string
					images?: Json | null
					last_synced_at?: string | null
					livemode?: boolean | null
					marketing_features?: Json | null
					metadata?: Json | null
					name?: string | null
					object?: string | null
					package_dimensions?: Json | null
					shippable?: boolean | null
					statement_descriptor?: string | null
					unit_label?: string | null
					updated?: number | null
					updated_at?: string
					url?: string | null
				}
				Relationships: []
			}
			refunds: {
				Row: {
					amount: number | null
					balance_transaction: string | null
					charge: string | null
					created: number | null
					currency: string | null
					destination_details: Json | null
					id: string
					last_synced_at: string | null
					metadata: Json | null
					object: string | null
					payment_intent: string | null
					reason: string | null
					receipt_number: string | null
					source_transfer_reversal: string | null
					status: string | null
					transfer_reversal: string | null
					updated_at: string
				}
				Insert: {
					amount?: number | null
					balance_transaction?: string | null
					charge?: string | null
					created?: number | null
					currency?: string | null
					destination_details?: Json | null
					id: string
					last_synced_at?: string | null
					metadata?: Json | null
					object?: string | null
					payment_intent?: string | null
					reason?: string | null
					receipt_number?: string | null
					source_transfer_reversal?: string | null
					status?: string | null
					transfer_reversal?: string | null
					updated_at?: string
				}
				Update: {
					amount?: number | null
					balance_transaction?: string | null
					charge?: string | null
					created?: number | null
					currency?: string | null
					destination_details?: Json | null
					id?: string
					last_synced_at?: string | null
					metadata?: Json | null
					object?: string | null
					payment_intent?: string | null
					reason?: string | null
					receipt_number?: string | null
					source_transfer_reversal?: string | null
					status?: string | null
					transfer_reversal?: string | null
					updated_at?: string
				}
				Relationships: []
			}
			reviews: {
				Row: {
					billing_zip: string | null
					charge: string | null
					closed_reason: string | null
					created: number | null
					id: string
					ip_address: string | null
					ip_address_location: Json | null
					last_synced_at: string | null
					livemode: boolean | null
					object: string | null
					open: boolean | null
					opened_reason: string | null
					payment_intent: string | null
					reason: string | null
					session: string | null
					updated_at: string
				}
				Insert: {
					billing_zip?: string | null
					charge?: string | null
					closed_reason?: string | null
					created?: number | null
					id: string
					ip_address?: string | null
					ip_address_location?: Json | null
					last_synced_at?: string | null
					livemode?: boolean | null
					object?: string | null
					open?: boolean | null
					opened_reason?: string | null
					payment_intent?: string | null
					reason?: string | null
					session?: string | null
					updated_at?: string
				}
				Update: {
					billing_zip?: string | null
					charge?: string | null
					closed_reason?: string | null
					created?: number | null
					id?: string
					ip_address?: string | null
					ip_address_location?: Json | null
					last_synced_at?: string | null
					livemode?: boolean | null
					object?: string | null
					open?: boolean | null
					opened_reason?: string | null
					payment_intent?: string | null
					reason?: string | null
					session?: string | null
					updated_at?: string
				}
				Relationships: []
			}
			setup_intents: {
				Row: {
					cancellation_reason: string | null
					created: number | null
					customer: string | null
					description: string | null
					id: string
					last_synced_at: string | null
					latest_attempt: string | null
					mandate: string | null
					object: string | null
					on_behalf_of: string | null
					payment_method: string | null
					single_use_mandate: string | null
					status: string | null
					usage: string | null
				}
				Insert: {
					cancellation_reason?: string | null
					created?: number | null
					customer?: string | null
					description?: string | null
					id: string
					last_synced_at?: string | null
					latest_attempt?: string | null
					mandate?: string | null
					object?: string | null
					on_behalf_of?: string | null
					payment_method?: string | null
					single_use_mandate?: string | null
					status?: string | null
					usage?: string | null
				}
				Update: {
					cancellation_reason?: string | null
					created?: number | null
					customer?: string | null
					description?: string | null
					id?: string
					last_synced_at?: string | null
					latest_attempt?: string | null
					mandate?: string | null
					object?: string | null
					on_behalf_of?: string | null
					payment_method?: string | null
					single_use_mandate?: string | null
					status?: string | null
					usage?: string | null
				}
				Relationships: []
			}
			subscription_items: {
				Row: {
					billing_thresholds: Json | null
					created: number | null
					current_period_end: number | null
					current_period_start: number | null
					deleted: boolean | null
					id: string
					last_synced_at: string | null
					metadata: Json | null
					object: string | null
					price: string | null
					quantity: number | null
					subscription: string | null
					tax_rates: Json | null
				}
				Insert: {
					billing_thresholds?: Json | null
					created?: number | null
					current_period_end?: number | null
					current_period_start?: number | null
					deleted?: boolean | null
					id: string
					last_synced_at?: string | null
					metadata?: Json | null
					object?: string | null
					price?: string | null
					quantity?: number | null
					subscription?: string | null
					tax_rates?: Json | null
				}
				Update: {
					billing_thresholds?: Json | null
					created?: number | null
					current_period_end?: number | null
					current_period_start?: number | null
					deleted?: boolean | null
					id?: string
					last_synced_at?: string | null
					metadata?: Json | null
					object?: string | null
					price?: string | null
					quantity?: number | null
					subscription?: string | null
					tax_rates?: Json | null
				}
				Relationships: []
			}
			subscription_schedules: {
				Row: {
					application: string | null
					canceled_at: number | null
					completed_at: number | null
					created: number
					current_phase: Json | null
					customer: string
					default_settings: Json | null
					end_behavior: string | null
					id: string
					last_synced_at: string | null
					livemode: boolean
					metadata: Json
					object: string | null
					phases: Json
					released_at: number | null
					released_subscription: string | null
					status: Database['stripe']['Enums']['subscription_schedule_status']
					subscription: string | null
					test_clock: string | null
				}
				Insert: {
					application?: string | null
					canceled_at?: number | null
					completed_at?: number | null
					created: number
					current_phase?: Json | null
					customer: string
					default_settings?: Json | null
					end_behavior?: string | null
					id: string
					last_synced_at?: string | null
					livemode: boolean
					metadata: Json
					object?: string | null
					phases: Json
					released_at?: number | null
					released_subscription?: string | null
					status: Database['stripe']['Enums']['subscription_schedule_status']
					subscription?: string | null
					test_clock?: string | null
				}
				Update: {
					application?: string | null
					canceled_at?: number | null
					completed_at?: number | null
					created?: number
					current_phase?: Json | null
					customer?: string
					default_settings?: Json | null
					end_behavior?: string | null
					id?: string
					last_synced_at?: string | null
					livemode?: boolean
					metadata?: Json
					object?: string | null
					phases?: Json
					released_at?: number | null
					released_subscription?: string | null
					status?: Database['stripe']['Enums']['subscription_schedule_status']
					subscription?: string | null
					test_clock?: string | null
				}
				Relationships: []
			}
			subscriptions: {
				Row: {
					application_fee_percent: number | null
					billing_cycle_anchor: number | null
					billing_thresholds: Json | null
					cancel_at: number | null
					cancel_at_period_end: boolean | null
					canceled_at: number | null
					collection_method: string | null
					created: number | null
					current_period_end: number | null
					current_period_start: number | null
					customer: string | null
					days_until_due: number | null
					default_payment_method: string | null
					default_source: string | null
					default_tax_rates: Json | null
					discount: Json | null
					ended_at: number | null
					id: string
					items: Json | null
					last_synced_at: string | null
					latest_invoice: string | null
					livemode: boolean | null
					metadata: Json | null
					next_pending_invoice_item_invoice: number | null
					object: string | null
					pause_collection: Json | null
					pending_invoice_item_interval: Json | null
					pending_setup_intent: string | null
					pending_update: Json | null
					plan: string | null
					schedule: string | null
					start_date: number | null
					status: Database['stripe']['Enums']['subscription_status'] | null
					transfer_data: Json | null
					trial_end: Json | null
					trial_start: Json | null
					updated_at: string
				}
				Insert: {
					application_fee_percent?: number | null
					billing_cycle_anchor?: number | null
					billing_thresholds?: Json | null
					cancel_at?: number | null
					cancel_at_period_end?: boolean | null
					canceled_at?: number | null
					collection_method?: string | null
					created?: number | null
					current_period_end?: number | null
					current_period_start?: number | null
					customer?: string | null
					days_until_due?: number | null
					default_payment_method?: string | null
					default_source?: string | null
					default_tax_rates?: Json | null
					discount?: Json | null
					ended_at?: number | null
					id: string
					items?: Json | null
					last_synced_at?: string | null
					latest_invoice?: string | null
					livemode?: boolean | null
					metadata?: Json | null
					next_pending_invoice_item_invoice?: number | null
					object?: string | null
					pause_collection?: Json | null
					pending_invoice_item_interval?: Json | null
					pending_setup_intent?: string | null
					pending_update?: Json | null
					plan?: string | null
					schedule?: string | null
					start_date?: number | null
					status?: Database['stripe']['Enums']['subscription_status'] | null
					transfer_data?: Json | null
					trial_end?: Json | null
					trial_start?: Json | null
					updated_at?: string
				}
				Update: {
					application_fee_percent?: number | null
					billing_cycle_anchor?: number | null
					billing_thresholds?: Json | null
					cancel_at?: number | null
					cancel_at_period_end?: boolean | null
					canceled_at?: number | null
					collection_method?: string | null
					created?: number | null
					current_period_end?: number | null
					current_period_start?: number | null
					customer?: string | null
					days_until_due?: number | null
					default_payment_method?: string | null
					default_source?: string | null
					default_tax_rates?: Json | null
					discount?: Json | null
					ended_at?: number | null
					id?: string
					items?: Json | null
					last_synced_at?: string | null
					latest_invoice?: string | null
					livemode?: boolean | null
					metadata?: Json | null
					next_pending_invoice_item_invoice?: number | null
					object?: string | null
					pause_collection?: Json | null
					pending_invoice_item_interval?: Json | null
					pending_setup_intent?: string | null
					pending_update?: Json | null
					plan?: string | null
					schedule?: string | null
					start_date?: number | null
					status?: Database['stripe']['Enums']['subscription_status'] | null
					transfer_data?: Json | null
					trial_end?: Json | null
					trial_start?: Json | null
					updated_at?: string
				}
				Relationships: []
			}
			tax_ids: {
				Row: {
					country: string | null
					created: number
					customer: string | null
					id: string
					last_synced_at: string | null
					livemode: boolean | null
					object: string | null
					owner: Json | null
					type: string | null
					value: string | null
				}
				Insert: {
					country?: string | null
					created: number
					customer?: string | null
					id: string
					last_synced_at?: string | null
					livemode?: boolean | null
					object?: string | null
					owner?: Json | null
					type?: string | null
					value?: string | null
				}
				Update: {
					country?: string | null
					created?: number
					customer?: string | null
					id?: string
					last_synced_at?: string | null
					livemode?: boolean | null
					object?: string | null
					owner?: Json | null
					type?: string | null
					value?: string | null
				}
				Relationships: []
			}
			webhook_events: {
				Row: {
					business_logic_ms: number | null
					created_at: string | null
					database_operations_ms: number | null
					event_type: string
					id: string
					processing_duration_ms: number | null
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
					processing_duration_ms?: number | null
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
					processing_duration_ms?: number | null
					signature_verification_ms?: number | null
					stripe_event_id?: string
					success?: boolean
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
		}
		Views: {
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
			cleanup_old_webhook_data:
				| {
						Args: { retention_days?: number }
						Returns: {
							rows_deleted: number
							table_name: string
						}[]
				  }
				| {
						Args: { batch_size?: number; retention_days?: number }
						Returns: {
							rows_deleted: number
							table_name: string
						}[]
				  }
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
			record_webhook_metrics_batch: { Args: { metrics: Json }; Returns: number }
			refresh_webhook_views: { Args: never; Returns: undefined }
		}
		Enums: {
			invoice_status:
				| 'draft'
				| 'open'
				| 'paid'
				| 'uncollectible'
				| 'void'
				| 'deleted'
			pricing_tiers: 'graduated' | 'volume'
			pricing_type: 'one_time' | 'recurring'
			subscription_schedule_status:
				| 'not_started'
				| 'active'
				| 'completed'
				| 'released'
				| 'canceled'
			subscription_status:
				| 'trialing'
				| 'active'
				| 'canceled'
				| 'incomplete'
				| 'incomplete_expired'
				| 'past_due'
				| 'unpaid'
				| 'paused'
		}
		CompositeTypes: {
			[_ in never]: never
		}
	}
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
				DefaultSchema['Views'])
		? (DefaultSchema['Tables'] &
				DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R
			}
			? R
			: never
		: never

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I
			}
			? I
			: never
		: never

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U
			}
			? U
			: never
		: never

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never

export const Constants = {
	public: {
		Enums: {
			invitation_type: ['platform_access', 'lease_signing'],
			lease_status: [
				'draft',
				'pending_signature',
				'active',
				'ended',
				'terminated'
			],
			maintenance_priority: ['low', 'normal', 'medium', 'high', 'urgent'],
			maintenance_status: [
				'open',
				'in_progress',
				'completed',
				'cancelled',
				'on_hold'
			],
			notification_type: ['maintenance', 'lease', 'payment', 'system'],
			payment_status: [
				'pending',
				'processing',
				'succeeded',
				'failed',
				'canceled',
				'cancelled',
				'requires_action'
			],
			property_status: ['active', 'inactive', 'sold'],
			security_event_severity: [
				'debug',
				'info',
				'warning',
				'error',
				'critical'
			],
			security_event_type: [
				'auth.login',
				'auth.logout',
				'auth.failed_login',
				'auth.password_change',
				'auth.password_reset',
				'user.created',
				'user.updated',
				'user.deleted',
				'property.created',
				'property.updated',
				'property.deleted',
				'lease.created',
				'lease.updated',
				'lease.deleted',
				'lease.signed',
				'payment.created',
				'payment.failed',
				'subscription.created',
				'subscription.canceled',
				'admin.action',
				'system.error',
				'system.warning'
			],
			signature_method: ['in_app', 'docuseal'],
			stripe_subscription_status: ['none', 'pending', 'active', 'failed'],
			unit_status: ['available', 'occupied', 'maintenance', 'reserved']
		}
	},
	stripe: {
		Enums: {
			invoice_status: [
				'draft',
				'open',
				'paid',
				'uncollectible',
				'void',
				'deleted'
			],
			pricing_tiers: ['graduated', 'volume'],
			pricing_type: ['one_time', 'recurring'],
			subscription_schedule_status: [
				'not_started',
				'active',
				'completed',
				'released',
				'canceled'
			],
			subscription_status: [
				'trialing',
				'active',
				'canceled',
				'incomplete',
				'incomplete_expired',
				'past_due',
				'unpaid',
				'paused'
			]
		}
	}
} as const
