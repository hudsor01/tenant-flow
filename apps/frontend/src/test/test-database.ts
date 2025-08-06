/**
 * Test Database Utilities
 * Provides in-memory database setup and seeding for tests
 */

import { vi } from 'vitest'

// Mock database entities
export interface TestProperty {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  property_type: 'single_family' | 'apartment' | 'condo' | 'townhouse'
  bedrooms: number
  bathrooms: number
  square_feet?: number
  rent_amount: number
  status: 'available' | 'occupied' | 'maintenance'
  owner_id: string
  created_at: string
  updated_at: string
}

export interface TestTenant {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  date_of_birth?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  property_id?: string
  unit_id?: string
  lease_start_date?: string
  lease_end_date?: string
  monthly_rent?: number
  security_deposit?: number
  status: 'active' | 'inactive' | 'pending'
  owner_id: string
  created_at: string
  updated_at: string
}

export interface TestLease {
  id: string
  property_id: string
  tenant_id: string
  start_date: string
  end_date: string
  monthly_rent: number
  security_deposit: number
  lease_terms: Record<string, unknown>
  status: 'active' | 'expired' | 'terminated' | 'pending'
  owner_id: string
  created_at: string
  updated_at: string
}

export interface TestMaintenanceRequest {
  id: string
  property_id: string
  tenant_id?: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'other'
  estimated_cost?: number
  actual_cost?: number
  scheduled_date?: string
  completed_date?: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface TestPayment {
  id: string
  tenant_id: string
  property_id: string
  lease_id: string
  amount: number
  payment_date: string
  due_date: string
  payment_method: 'bank_transfer' | 'credit_card' | 'check' | 'cash'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  transaction_id?: string
  notes?: string
  owner_id: string
  created_at: string
  updated_at: string
}

// In-memory database store
class TestDatabase {
  private properties = new Map<string, TestProperty>()
  private tenants = new Map<string, TestTenant>()
  private leases = new Map<string, TestLease>()
  private maintenanceRequests = new Map<string, TestMaintenanceRequest>()
  private payments = new Map<string, TestPayment>()

  // Properties
  createProperty(property: Omit<TestProperty, 'id' | 'created_at' | 'updated_at'>): TestProperty {
    const id = `prop_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const now = new Date().toISOString()
    const fullProperty: TestProperty = {
      ...property,
      id,
      created_at: now,
      updated_at: now
    }
    this.properties.set(id, fullProperty)
    return fullProperty
  }

  getProperty(id: string): TestProperty | undefined {
    return this.properties.get(id)
  }

  getAllProperties(ownerId?: string): TestProperty[] {
    const properties = Array.from(this.properties.values())
    return ownerId ? properties.filter(p => p.owner_id === ownerId) : properties
  }

  updateProperty(id: string, updates: Partial<TestProperty>): TestProperty | undefined {
    const property = this.properties.get(id)
    if (!property) return undefined
    
    const updated = { ...property, ...updates, updated_at: new Date().toISOString() }
    this.properties.set(id, updated)
    return updated
  }

  deleteProperty(id: string): boolean {
    return this.properties.delete(id)
  }

  // Tenants
  createTenant(tenant: Omit<TestTenant, 'id' | 'created_at' | 'updated_at'>): TestTenant {
    const id = `tenant_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const now = new Date().toISOString()
    const fullTenant: TestTenant = {
      ...tenant,
      id,
      created_at: now,
      updated_at: now
    }
    this.tenants.set(id, fullTenant)
    return fullTenant
  }

  getTenant(id: string): TestTenant | undefined {
    return this.tenants.get(id)
  }

  getAllTenants(ownerId?: string): TestTenant[] {
    const tenants = Array.from(this.tenants.values())
    return ownerId ? tenants.filter(t => t.owner_id === ownerId) : tenants
  }

  updateTenant(id: string, updates: Partial<TestTenant>): TestTenant | undefined {
    const tenant = this.tenants.get(id)
    if (!tenant) return undefined
    
    const updated = { ...tenant, ...updates, updated_at: new Date().toISOString() }
    this.tenants.set(id, updated)
    return updated
  }

  deleteTenant(id: string): boolean {
    return this.tenants.delete(id)
  }

  // Leases
  createLease(lease: Omit<TestLease, 'id' | 'created_at' | 'updated_at'>): TestLease {
    const id = `lease_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const now = new Date().toISOString()
    const fullLease: TestLease = {
      ...lease,
      id,
      created_at: now,
      updated_at: now
    }
    this.leases.set(id, fullLease)
    return fullLease
  }

  getLease(id: string): TestLease | undefined {
    return this.leases.get(id)
  }

  getAllLeases(ownerId?: string): TestLease[] {
    const leases = Array.from(this.leases.values())
    return ownerId ? leases.filter(l => l.owner_id === ownerId) : leases
  }

  updateLease(id: string, updates: Partial<TestLease>): TestLease | undefined {
    const lease = this.leases.get(id)
    if (!lease) return undefined
    
    const updated = { ...lease, ...updates, updated_at: new Date().toISOString() }
    this.leases.set(id, updated)
    return updated
  }

  deleteLease(id: string): boolean {
    return this.leases.delete(id)
  }

  // Maintenance Requests
  createMaintenanceRequest(request: Omit<TestMaintenanceRequest, 'id' | 'created_at' | 'updated_at'>): TestMaintenanceRequest {
    const id = `maint_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const now = new Date().toISOString()
    const fullRequest: TestMaintenanceRequest = {
      ...request,
      id,
      created_at: now,
      updated_at: now
    }
    this.maintenanceRequests.set(id, fullRequest)
    return fullRequest
  }

  getMaintenanceRequest(id: string): TestMaintenanceRequest | undefined {
    return this.maintenanceRequests.get(id)
  }

  getAllMaintenanceRequests(ownerId?: string): TestMaintenanceRequest[] {
    const requests = Array.from(this.maintenanceRequests.values())
    return ownerId ? requests.filter(r => r.owner_id === ownerId) : requests
  }

  updateMaintenanceRequest(id: string, updates: Partial<TestMaintenanceRequest>): TestMaintenanceRequest | undefined {
    const request = this.maintenanceRequests.get(id)
    if (!request) return undefined
    
    const updated = { ...request, ...updates, updated_at: new Date().toISOString() }
    this.maintenanceRequests.set(id, updated)
    return updated
  }

  deleteMaintenanceRequest(id: string): boolean {
    return this.maintenanceRequests.delete(id)
  }

  // Payments
  createPayment(payment: Omit<TestPayment, 'id' | 'created_at' | 'updated_at'>): TestPayment {
    const id = `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const now = new Date().toISOString()
    const fullPayment: TestPayment = {
      ...payment,
      id,
      created_at: now,
      updated_at: now
    }
    this.payments.set(id, fullPayment)
    return fullPayment
  }

  getPayment(id: string): TestPayment | undefined {
    return this.payments.get(id)
  }

  getAllPayments(ownerId?: string): TestPayment[] {
    const payments = Array.from(this.payments.values())
    return ownerId ? payments.filter(p => p.owner_id === ownerId) : payments
  }

  updatePayment(id: string, updates: Partial<TestPayment>): TestPayment | undefined {
    const payment = this.payments.get(id)
    if (!payment) return undefined
    
    const updated = { ...payment, ...updates, updated_at: new Date().toISOString() }
    this.payments.set(id, updated)
    return updated
  }

  deletePayment(id: string): boolean {
    return this.payments.delete(id)
  }

  // Utility methods
  clear(): void {
    this.properties.clear()
    this.tenants.clear()
    this.leases.clear()
    this.maintenanceRequests.clear()
    this.payments.clear()
  }

  reset(): void {
    this.clear()
  }

  getStats() {
    return {
      properties: this.properties.size,
      tenants: this.tenants.size,
      leases: this.leases.size,
      maintenanceRequests: this.maintenanceRequests.size,
      payments: this.payments.size
    }
  }
}

// Global test database instance
export const testDb = new TestDatabase()

// Mock Supabase client that uses test database
export const createMockSupabaseClient = () => {
  const mockFrom = (table: string) => {
    const operations = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      rangeGt: vi.fn().mockReturnThis(),
      rangeGte: vi.fn().mockReturnThis(),
      rangeLt: vi.fn().mockReturnThis(),
      rangeLte: vi.fn().mockReturnThis(),
      rangeAdjacent: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      then: vi.fn()
    }

    // Mock implementations based on table
    switch (table) {
      case 'properties':
        operations.single.mockImplementation(() => 
          Promise.resolve({ data: testDb.getAllProperties()[0] || null, error: null })
        )
        operations.then.mockImplementation((callback) => 
          callback({ data: testDb.getAllProperties(), error: null })
        )
        break
      case 'tenants':
        operations.single.mockImplementation(() => 
          Promise.resolve({ data: testDb.getAllTenants()[0] || null, error: null })
        )
        operations.then.mockImplementation((callback) => 
          callback({ data: testDb.getAllTenants(), error: null })
        )
        break
      case 'leases':
        operations.single.mockImplementation(() => 
          Promise.resolve({ data: testDb.getAllLeases()[0] || null, error: null })
        )
        operations.then.mockImplementation((callback) => 
          callback({ data: testDb.getAllLeases(), error: null })
        )
        break
      case 'maintenance_requests':
        operations.single.mockImplementation(() => 
          Promise.resolve({ data: testDb.getAllMaintenanceRequests()[0] || null, error: null })
        )
        operations.then.mockImplementation((callback) => 
          callback({ data: testDb.getAllMaintenanceRequests(), error: null })
        )
        break
      case 'payments':
        operations.single.mockImplementation(() => 
          Promise.resolve({ data: testDb.getAllPayments()[0] || null, error: null })
        )
        operations.then.mockImplementation((callback) => 
          callback({ data: testDb.getAllPayments(), error: null })
        )
        break
      default:
        operations.single.mockResolvedValue({ data: null, error: null })
        operations.then.mockImplementation((callback) => callback({ data: [], error: null }))
    }

    return operations
  }

  return {
    from: mockFrom,
    auth: {
      getSession: vi.fn().mockResolvedValue({ 
        data: { session: null }, 
        error: null 
      }),
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: null }, 
        error: null 
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ 
        data: { subscription: { unsubscribe: vi.fn() } } 
      }))
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ 
          data: { publicUrl: 'https://example.com/file.jpg' } 
        })
      }))
    }
  }
}