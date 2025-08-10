'use client'

import { useCallback } from 'react'
import { usePostHog } from './use-posthog'
import type { Property } from '@repo/shared'

export function usePropertyTracking() {
  const { trackEvent } = usePostHog()

  const trackPropertyView = useCallback((property: Property) => {
    trackEvent('property_viewed', {
      property_id: property.id,
      property_name: property.name,
      property_type: property.propertyType,
      units: property.units,
    })
  }, [trackEvent])

  const trackPropertyCreate = useCallback((property: Partial<Property>) => {
    trackEvent('property_created', {
      property_name: property.name,
      property_type: property.propertyType,
      address: property.address,
      city: property.city,
      state: property.state,
    })
  }, [trackEvent])

  const trackPropertyUpdate = useCallback((propertyId: string, updates: Partial<Property>) => {
    trackEvent('property_updated', {
      property_id: propertyId,
      updated_fields: Object.keys(updates),
    })
  }, [trackEvent])

  const trackPropertyDelete = useCallback((propertyId: string) => {
    trackEvent('property_deleted', {
      property_id: propertyId,
    })
  }, [trackEvent])

  return {
    trackPropertyView,
    trackPropertyCreate,
    trackPropertyUpdate,
    trackPropertyDelete,
  }
}