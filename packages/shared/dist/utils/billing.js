/**
 * Billing utilities
 * Helper functions for billing and subscription display
 */
export const getPlanTypeLabel = (plan) => {
    const labels = {
        FREE: 'Free Trial',
        STARTER: 'Starter',
        GROWTH: 'Growth',
        ENTERPRISE: 'Enterprise'
    };
    return labels[plan] || plan;
};
