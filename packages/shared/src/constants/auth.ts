/**
 * Authentication constants
 * Runtime constants and enums for user authentication and roles
 */

export const USER_ROLE = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  TENANT: 'TENANT',
  ADMIN: 'ADMIN'
} as const

export const USER_ROLE_OPTIONS = Object.values(USER_ROLE)