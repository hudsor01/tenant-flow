import { hc } from 'hono/client'
import { supabase } from './supabase-client'

// Get the backend URL - must match Hono mount path in main.ts
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://tenantflow.app'

// The backend mounts Hono at /api/hono and the Hono service mounts routes at /api/v1
// So full path is: /api/hono/api/v1/{endpoint}
const honoAPI = hc(`${BACKEND_URL}/api/hono`, {
    headers: async (): Promise<Record<string, string>> => {
        // Get current session token
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.access_token) {
            return {
                Authorization: `Bearer ${session.access_token}`
            }
        }
        
        return {}
    }
})

// Type the Hono API to ensure proper structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const typedHonoAPI = honoAPI as any

// Create a client structure that properly handles the nested API structure
// This ensures all api.v1 properties are defined and not undefined
export const honoClient = {
    api: {
        v1: {
            auth: typedHonoAPI.api?.v1?.auth || {},
            properties: typedHonoAPI.api?.v1?.properties || {},
            tenants: typedHonoAPI.api?.v1?.tenants || {},
            maintenance: typedHonoAPI.api?.v1?.maintenance || {},
            units: typedHonoAPI.api?.v1?.units || {},
            leases: typedHonoAPI.api?.v1?.leases || {},
            subscriptions: typedHonoAPI.api?.v1?.subscriptions || {}
        }
    }
}

// Export the client for direct RPC access
export const rpc = honoClient

// Helper function to get Hono client - for backward compatibility with migrated hooks
export async function getHonoClient() {
    return honoClient
}

// Re-export the base Hono API for direct use
export { honoAPI as baseClient }