// Centralized entity types based on Prisma schema

// Define UserRole enum to match Prisma schema
export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER', 
  TENANT = 'TENANT',
  ADMIN = 'ADMIN'
}

// Main User type based on Prisma schema
export interface User {
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

// Placeholder types - these would be generated from your actual Prisma schema
export interface Property {
  id: string
  // Add other property fields as needed
}

export interface Unit {
  id: string
  // Add other unit fields as needed
}

export interface Tenant {
  id: string
  // Add other tenant fields as needed
}

export interface Lease {
  unit: string
  unitId: string
  id: string
  // Add other lease fields as needed
}

export interface Payment {
  id: string
  // Add other payment fields as needed
}

export interface MaintenanceRequest {
  id: string
  // Add other maintenance request fields as needed
}

export interface Document {
  id: string
  // Add other document fields as needed
}

export interface Notification {
  id: string
  // Add other notification fields as needed
}