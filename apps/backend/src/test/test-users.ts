/**
 * Test User Utilities
 * Provides test user data and authentication helpers
 */

import { faker } from '@faker-js/faker'
import type { UserRole } from '@repo/shared'

export interface TestUser {
  id: string
  email: string
  name: string
  role: UserRole
  supabaseId: string
  accessToken: string
  refreshToken: string
}

export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => {
  const id = faker.string.uuid()
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const email = faker.internet.email({ firstName, lastName })
  
  return {
    id,
    email,
    name: `${firstName} ${lastName}`,
    role: 'OWNER',
    supabaseId: faker.string.uuid(),
    accessToken: `test-access-token-${faker.string.alphanumeric(40)}`,
    refreshToken: `test-refresh-token-${faker.string.alphanumeric(40)}`,
    ...overrides
  }
}

export const createOwnerUser = (overrides: Partial<TestUser> = {}): TestUser => {
  return createTestUser({ role: 'OWNER', ...overrides })
}

export const createTenantUser = (overrides: Partial<TestUser> = {}): TestUser => {
  return createTestUser({ role: 'TENANT', ...overrides })
}

export const createAdminUser = (overrides: Partial<TestUser> = {}): TestUser => {
  return createTestUser({ role: 'ADMIN', ...overrides })
}

export const TEST_USERS = {
  owner: createOwnerUser(),
  tenant: createTenantUser(),
  admin: createAdminUser()
}