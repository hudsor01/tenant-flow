/* gitguardian:disable */
/**
 * Test User Utilities
 * Provides test user data and authentication helpers
 * 
 * THIS IS A TEST FILE - ALL TOKENS ARE MOCKED
 */

import { faker } from '@faker-js/faker'
import type { UserRole } from '@repo/shared'
import { createTestAccessToken, createTestRefreshToken } from './test-constants'
import type { ValidatedUser } from '../auth/auth.service'

// TestUser now extends ValidatedUser to ensure compatibility with controller tests
export interface TestUser extends ValidatedUser {
  accessToken: string
  refreshToken: string
}

export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => {
  const id = faker.string.uuid()
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const email = faker.internet.email({ firstName, lastName })
  const supabaseId = faker.string.uuid()
  const now = new Date().toISOString()
  
  return {
    id,
    email,
    name: `${firstName} ${lastName}`,
    role: 'OWNER' as UserRole,
    supabaseId,
    accessToken: createTestAccessToken(id),
    refreshToken: createTestRefreshToken(id),
    // Additional ValidatedUser fields
    avatarUrl: faker.image.avatar(),
    phone: faker.phone.number(),
    bio: faker.lorem.sentence(),
    organizationId: faker.string.uuid(),
    emailVerified: true,
    stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
    createdAt: now,
    updatedAt: now,
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