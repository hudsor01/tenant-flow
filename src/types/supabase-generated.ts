/**
 * Fallback Supabase Database Types
 * 
 * These are basic types used when type generation fails.
 * Please fix the type generation to get proper types.
 */

export interface Database {
  public: {
    Tables: {
      User: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          updatedAt?: string
        }
      }
      Property: {
        Row: {
          id: string
          name: string
          address: string
          ownerId: string
          type: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          ownerId: string
          type?: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          type?: string
          updatedAt?: string
        }
      }
      // Add other tables as needed...
    }
    Views: {}
    Functions: {}
    Enums: {
      UserRole: 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN'
      PropertyType: 'SINGLE_FAMILY' | 'DUPLEX' | 'APARTMENT' | 'CONDO' | 'TOWNHOUSE'
      UnitStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'OFFLINE'
      LeaseStatus: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
      PaymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
      InvitationStatus: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
