import { hc } from 'hono/client'
import { supabase } from './supabase-client'

// Get the backend URL - must match Hono mount path in main.ts
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'

// Define basic client type structure that matches our backend Hono routes
type HonoApiClient = {
    api: {
        v1: {
            auth: Record<string, any>
            properties: Record<string, any>
            tenants: Record<string, any>
            maintenance: Record<string, any>
            units: Record<string, any>
            leases: Record<string, any>
            subscriptions: Record<string, any>
        }
    }
}

// Create base client without specific typing to avoid import issues
const baseClient = hc(`${BACKEND_URL}/api/hono`, {
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
}) as unknown as HonoApiClient

// Create a client structure that matches the backend Hono app structure
export const honoClient = {
    api: {
        v1: {
            auth: baseClient.api?.v1?.auth || {},
            properties: baseClient.api?.v1?.properties || {},
            tenants: baseClient.api?.v1?.tenants || {},
            maintenance: baseClient.api?.v1?.maintenance || {},
            units: baseClient.api?.v1?.units || {},
            leases: baseClient.api?.v1?.leases || {},
            subscriptions: baseClient.api?.v1?.subscriptions || {}
        }
    }
}

// Export the client for direct RPC access
export const rpc = honoClient

// Helper function to get Hono client - for backward compatibility with migrated hooks
export async function getHonoClient() {
    return honoClient
}

// Re-export for direct use
export { baseClient }