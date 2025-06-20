export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      Document: {
        Row: {
          createdAt: string
          id: string
          leaseId: string | null
          name: string
          propertyId: string | null
          type: Database["public"]["Enums"]["DocumentType"]
          updatedAt: string
          url: string
        }
        Insert: {
          createdAt?: string
          id: string
          leaseId?: string | null
          name: string
          propertyId?: string | null
          type: Database["public"]["Enums"]["DocumentType"]
          updatedAt?: string
          url: string
        }
        Update: {
          createdAt?: string
          id?: string
          leaseId?: string | null
          name?: string
          propertyId?: string | null
          type?: Database["public"]["Enums"]["DocumentType"]
          updatedAt?: string
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
      Lease: {
        Row: {
          createdAt: string
          endDate: string
          id: string
          rentAmount: number
          securityDeposit: number
          startDate: string
          status: Database["public"]["Enums"]["LeaseStatus"]
          tenantId: string
          unitId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          endDate: string
          id: string
          rentAmount: number
          securityDeposit: number
          startDate: string
          status?: Database["public"]["Enums"]["LeaseStatus"]
          tenantId: string
          unitId: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          endDate?: string
          id?: string
          rentAmount?: number
          securityDeposit?: number
          startDate?: string
          status?: Database["public"]["Enums"]["LeaseStatus"]
          tenantId?: string
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
      MaintenanceRequest: {
        Row: {
          createdAt: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["Priority"]
          status: Database["public"]["Enums"]["RequestStatus"]
          title: string
          unitId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          description: string
          id: string
          priority?: Database["public"]["Enums"]["Priority"]
          status?: Database["public"]["Enums"]["RequestStatus"]
          title: string
          unitId: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["Priority"]
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
      Notification: {
        Row: {
          actionUrl: string | null
          createdAt: string
          data: string | null
          id: string
          leaseId: string | null
          maintenanceId: string | null
          message: string
          paymentId: string | null
          priority: Database["public"]["Enums"]["NotificationPriority"]
          propertyId: string | null
          read: boolean
          tenantId: string | null
          title: string
          type: Database["public"]["Enums"]["NotificationType"]
          updatedAt: string
          userId: string
        }
        Insert: {
          actionUrl?: string | null
          createdAt?: string
          data?: string | null
          id: string
          leaseId?: string | null
          maintenanceId?: string | null
          message: string
          paymentId?: string | null
          priority?: Database["public"]["Enums"]["NotificationPriority"]
          propertyId?: string | null
          read?: boolean
          tenantId?: string | null
          title: string
          type: Database["public"]["Enums"]["NotificationType"]
          updatedAt?: string
          userId: string
        }
        Update: {
          actionUrl?: string | null
          createdAt?: string
          data?: string | null
          id?: string
          leaseId?: string | null
          maintenanceId?: string | null
          message?: string
          paymentId?: string | null
          priority?: Database["public"]["Enums"]["NotificationPriority"]
          propertyId?: string | null
          read?: boolean
          tenantId?: string | null
          title?: string
          type?: Database["public"]["Enums"]["NotificationType"]
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Notification_leaseId_fkey"
            columns: ["leaseId"]
            isOneToOne: false
            referencedRelation: "Lease"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Notification_maintenanceId_fkey"
            columns: ["maintenanceId"]
            isOneToOne: false
            referencedRelation: "MaintenanceRequest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Notification_paymentId_fkey"
            columns: ["paymentId"]
            isOneToOne: false
            referencedRelation: "Payment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Notification_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Notification_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Notification_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Payment: {
        Row: {
          amount: number
          createdAt: string
          date: string
          id: string
          leaseId: string
          notes: string | null
          status: Database["public"]["Enums"]["PaymentStatus"]
          type: Database["public"]["Enums"]["PaymentType"]
          updatedAt: string
        }
        Insert: {
          amount: number
          createdAt?: string
          date: string
          id: string
          leaseId: string
          notes?: string | null
          status?: Database["public"]["Enums"]["PaymentStatus"]
          type?: Database["public"]["Enums"]["PaymentType"]
          updatedAt?: string
        }
        Update: {
          amount?: number
          createdAt?: string
          date?: string
          id?: string
          leaseId?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["PaymentStatus"]
          type?: Database["public"]["Enums"]["PaymentType"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Payment_leaseId_fkey"
            columns: ["leaseId"]
            isOneToOne: false
            referencedRelation: "Lease"
            referencedColumns: ["id"]
          },
        ]
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
          state: string
          updatedAt: string
          zipCode: string
        }
        Insert: {
          address: string
          city: string
          createdAt?: string
          description?: string | null
          id: string
          imageUrl?: string | null
          name: string
          ownerId: string
          state: string
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
          state?: string
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
      Subscription: {
        Row: {
          createdAt: string
          endDate: string | null
          id: string
          plan: Database["public"]["Enums"]["PlanType"]
          startDate: string
          status: Database["public"]["Enums"]["SubStatus"]
          updatedAt: string
          userId: string
        }
        Insert: {
          createdAt?: string
          endDate?: string | null
          id: string
          plan?: Database["public"]["Enums"]["PlanType"]
          startDate?: string
          status?: Database["public"]["Enums"]["SubStatus"]
          updatedAt?: string
          userId: string
        }
        Update: {
          createdAt?: string
          endDate?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["PlanType"]
          startDate?: string
          status?: Database["public"]["Enums"]["SubStatus"]
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
          acceptedAt: string | null
          createdAt: string
          email: string
          emergencyContact: string | null
          expiresAt: string | null
          id: string
          invitationStatus: Database["public"]["Enums"]["InvitationStatus"]
          invitationToken: string | null
          invitedAt: string | null
          invitedBy: string | null
          name: string
          phone: string | null
          updatedAt: string
          userId: string | null
        }
        Insert: {
          acceptedAt?: string | null
          createdAt?: string
          email: string
          emergencyContact?: string | null
          expiresAt?: string | null
          id: string
          invitationStatus?: Database["public"]["Enums"]["InvitationStatus"]
          invitationToken?: string | null
          invitedAt?: string | null
          invitedBy?: string | null
          name: string
          phone?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Update: {
          acceptedAt?: string | null
          createdAt?: string
          email?: string
          emergencyContact?: string | null
          expiresAt?: string | null
          id?: string
          invitationStatus?: Database["public"]["Enums"]["InvitationStatus"]
          invitationToken?: string | null
          invitedAt?: string | null
          invitedBy?: string | null
          name?: string
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
          id: string
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
          id: string
          name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["UserRole"]
          updatedAt: string
        }
        Insert: {
          avatarUrl?: string | null
          bio?: string | null
          createdAt?: string
          email: string
          id: string
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["UserRole"]
          updatedAt?: string
        }
        Update: {
          avatarUrl?: string | null
          bio?: string | null
          createdAt?: string
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["UserRole"]
          updatedAt?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      DocumentType:
        | "LEASE"
        | "INVOICE"
        | "RECEIPT"
        | "PROPERTY_PHOTO"
        | "INSPECTION"
        | "MAINTENANCE"
        | "OTHER"
      InvitationStatus: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED"
      LeaseStatus: "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED"
      NotificationPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
      NotificationType:
        | "PROPERTY"
        | "TENANT"
        | "MAINTENANCE"
        | "PAYMENT"
        | "LEASE"
        | "SYSTEM"
      PaymentStatus: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"
      PaymentType: "RENT" | "DEPOSIT" | "LATE_FEE" | "MAINTENANCE" | "OTHER"
      PlanType: "BASIC" | "PROFESSIONAL" | "ENTERPRISE"
      Priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY"
      RequestStatus: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED"
      SubStatus: "ACTIVE" | "CANCELED" | "PAST_DUE"
      UnitStatus: "VACANT" | "OCCUPIED" | "MAINTENANCE" | "RESERVED"
      UserRole: "OWNER" | "MANAGER" | "TENANT" | "ADMIN"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      DocumentType: [
        "LEASE",
        "INVOICE",
        "RECEIPT",
        "PROPERTY_PHOTO",
        "INSPECTION",
        "MAINTENANCE",
        "OTHER",
      ],
      InvitationStatus: ["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"],
      LeaseStatus: ["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"],
      NotificationPriority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      NotificationType: [
        "PROPERTY",
        "TENANT",
        "MAINTENANCE",
        "PAYMENT",
        "LEASE",
        "SYSTEM",
      ],
      PaymentStatus: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
      PaymentType: ["RENT", "DEPOSIT", "LATE_FEE", "MAINTENANCE", "OTHER"],
      PlanType: ["BASIC", "PROFESSIONAL", "ENTERPRISE"],
      Priority: ["LOW", "MEDIUM", "HIGH", "EMERGENCY"],
      RequestStatus: ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED"],
      SubStatus: ["ACTIVE", "CANCELED", "PAST_DUE"],
      UnitStatus: ["VACANT", "OCCUPIED", "MAINTENANCE", "RESERVED"],
      UserRole: ["OWNER", "MANAGER", "TENANT", "ADMIN"],
    },
  },
} as const

