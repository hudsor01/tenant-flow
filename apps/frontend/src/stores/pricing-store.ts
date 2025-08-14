import { create } from 'zustand'
import type { SubscriptionState, UsageMetrics } from '@/lib/subscription-sync'

interface PricingStore {
  subscription: SubscriptionState | null
  usageMetrics: UsageMetrics | null
  setSubscription: (subscription: SubscriptionState | null) => void
  clearSubscription: () => void
  setUsageMetrics: (metrics: UsageMetrics | null) => void
}

export const usePricingStore = create<PricingStore>((set) => ({
  subscription: null,
  usageMetrics: null,
  setSubscription: (subscription) => set({ subscription }),
  clearSubscription: () => set({ subscription: null }),
  setUsageMetrics: (metrics) => set({ usageMetrics: metrics }),
}))