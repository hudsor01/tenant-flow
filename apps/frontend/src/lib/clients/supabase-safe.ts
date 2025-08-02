import { supabase, supabaseAnon } from './supabase-client'
import type { Database } from '@/types/supabase-generated'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Safe Supabase client wrapper that throws meaningful errors when client is null
 * This prevents runtime null reference errors and makes missing env vars obvious
 */
class SupabaseSafeWrapper {
  private get client(): SupabaseClient<Database> {
    if (!supabase) {
      throw new Error(
        'Supabase client is not initialized. Please check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are set.'
      )
    }
    return supabase
  }

  private get anonClient(): SupabaseClient<Database> {
    if (!supabaseAnon) {
      throw new Error(
        'Supabase anonymous client is not initialized. Please check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are set.'
      )
    }
    return supabaseAnon
  }

  // Auth methods
  get auth() {
    return this.client.auth
  }

  // Database methods
  from<T extends keyof Database['public']['Tables']>(table: T) {
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
      from: <T extends keyof Database['public']['Tables']>(table: T) => {
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
  getRawClient(): SupabaseClient<Database> {
    return this.client
  }

  // Get raw anon client (with null check)
  getRawAnonClient(): SupabaseClient<Database> {
    return this.anonClient
  }
}

export const supabaseSafe = new SupabaseSafeWrapper()
export default supabaseSafe