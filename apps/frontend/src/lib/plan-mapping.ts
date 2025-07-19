/**
 * Plan Mapping Utility - 4-tier system
 * 
 * This file handles the conversion between UI plan concepts and database PlanType enum values.
 * 
 * Database PlanType enum: [FREE, STARTER, GROWTH, ENTERPRISE]
 * UI Plan concepts: FREE, STARTER, GROWTH, ENTERPRISE
 */

import { PlanType } from '@/types/prisma-types'

// UI plan concept to database enum mapping - 4-tier system
export const UI_TO_DB_PLAN_MAPPING = {
  FREE: PlanType.FREE,
  STARTER: PlanType.STARTER,
  GROWTH: PlanType.GROWTH,
  ENTERPRISE: PlanType.ENTERPRISE,
} as const

// Database enum to UI plan concept mapping
export const DB_TO_UI_PLAN_MAPPING = {
  [PlanType.FREE]: 'FREE',
  [PlanType.STARTER]: 'STARTER',
  [PlanType.GROWTH]: 'GROWTH',
  [PlanType.ENTERPRISE]: 'ENTERPRISE',
} as const

// Type definitions for UI plan concepts
export type UIPlanConcept = keyof typeof UI_TO_DB_PLAN_MAPPING
export type DBPlanType = PlanType

/**
 * Convert UI plan concept to database PlanType enum value
 */
export function mapUIToDBPlan(uiPlan: UIPlanConcept): DBPlanType {
  return UI_TO_DB_PLAN_MAPPING[uiPlan]
}

/**
 * Convert database PlanType enum value to UI plan concept
 */
export function mapDBToUIPlan(dbPlan: DBPlanType): UIPlanConcept {
  return DB_TO_UI_PLAN_MAPPING[dbPlan] as UIPlanConcept
}

/**
 * Check if a UI plan concept is valid
 */
export function isValidUIPlan(plan: string): plan is UIPlanConcept {
  return plan in UI_TO_DB_PLAN_MAPPING
}

/**
 * Check if a database plan type is valid
 */
export function isValidDBPlan(plan: string): plan is DBPlanType {
  return Object.values(PlanType).includes(plan as PlanType)
}

/**
 * Get plan display name for UI
 */
export function getPlanDisplayName(plan: UIPlanConcept | DBPlanType): string {
  const uiPlan = typeof plan === 'string' && isValidDBPlan(plan)
    ? mapDBToUIPlan(plan as DBPlanType)
    : plan as UIPlanConcept

  const displayNames = {
    FREE: 'Free Trial',
    STARTER: 'Starter',
    GROWTH: 'Growth',
    ENTERPRISE: 'Enterprise',
  }

  return displayNames[uiPlan] || 'Unknown Plan'
}

/**
 * Plan validation helper
 */
export function validatePlanMapping() {
  // Ensure all UI plans map to valid DB plans
  for (const [uiPlan, dbPlan] of Object.entries(UI_TO_DB_PLAN_MAPPING)) {
    if (!Object.values(PlanType).includes(dbPlan)) {
      throw new Error(`Invalid DB plan mapping: ${uiPlan} -> ${dbPlan}`)
    }
  }

  // Ensure all DB plans have UI mappings
  for (const dbPlan of Object.values(PlanType)) {
    if (!(dbPlan in DB_TO_UI_PLAN_MAPPING)) {
      throw new Error(`Missing UI mapping for DB plan: ${dbPlan}`)
    }
  }

  return true
}

// Run validation on module load
validatePlanMapping()