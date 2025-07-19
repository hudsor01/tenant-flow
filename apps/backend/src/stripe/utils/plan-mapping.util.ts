export class PlanMappingUtil {
    static mapPlanToUI(planId: string): string {
        const mapping: Record<string, string> = {
            'FREE': 'FREE',
            'PAID': 'PAID'
        }
        return mapping[planId] || planId
    }

    static mapUIToPlan(uiPlan: string): string {
        const mapping: Record<string, string> = {
            'FREE': 'FREE',
            'PAID': 'PAID'
        }
        return mapping[uiPlan] || uiPlan
    }

    static normalizePlanId(planId: string): string {
        // Simple normalization for 2-plan system
        const mapping: Record<string, string> = {
            'FREE': 'free',
            'PAID': 'paid'
        }
        
        const normalized = mapping[planId] || planId.toLowerCase()
        return normalized
    }
}