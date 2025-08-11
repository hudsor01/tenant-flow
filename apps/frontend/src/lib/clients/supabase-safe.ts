import { supabase } from '../supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Safe Supabase client wrapper that throws meaningful errors when client is null
 * This prevents runtime null reference errors and makes missing env vars obvious
 */
class SupabaseSafeWrapper {
  private get client(): SupabaseClient {
    if (!supabase) {
      throw new Error(
        'Supabase client is not initialized. Please check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables are set.'
      )
    }
    return supabase
  }

  private get anonClient(): SupabaseClient {
    // Use the same client instance since we don't have a separate anon client
    return this.client
  }

  // Auth methods
  get auth() {
    return this.client.auth
  }

  // Database methods
  from(table: string) {
    return this.client.from(table)
  }

  // Storage methods
  get storage() {
    return this.client.storage
  }

  // Realtime methods
  channel(name: string) {
    return this.client.channel(name)
  }

  // Anonymous client access
  get anon() {
    return {
      from: (table: string) => {
        return this.anonClient.from(table)
      },
      auth: this.anonClient.auth,
      storage: this.anonClient.storage
    }
  }

  // Check if client is available
  get isAvailable(): boolean {
    return supabase !== null
  }

  // Get raw client (with null check)
  getRawClient(): SupabaseClient {
    return this.client
  }

  // Get raw anon client (with null check)
  getRawAnonClient(): SupabaseClient {
    return this.anonClient
  }
}

export const supabaseSafe = new SupabaseSafeWrapper()
export default supabaseSafe