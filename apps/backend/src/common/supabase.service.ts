import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseService {
  private _supabase: SupabaseClient | null = null

  constructor(private configService: ConfigService) {}

  private get supabase(): SupabaseClient {
    if (!this._supabase) {
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL')
      const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing required Supabase configuration')
      }

      this._supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    }
    return this._supabase
  }

  getClient(): SupabaseClient {
    return this.supabase
  }
}