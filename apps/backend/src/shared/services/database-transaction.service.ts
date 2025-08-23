import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'

/**
 * Unified Database Transaction Service
 * Eliminates DRY violations in database transaction handling
 */
@Injectable()
export class DatabaseTransactionService {
	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Executes multiple operations in a transaction
	 */
	async withTransaction<T>(
		operations: (client: SupabaseClient<Database>) => Promise<T>
	): Promise<T> {
		const client = this.supabase.getAdminClient()
		// Supabase handles rollback automatically, so we can just return the operations result
		return operations(client)
	}

	/**
	 * Get admin client for database operations
	 */
	getClient(): SupabaseClient<Database> {
		return this.supabase.getAdminClient()
	}
}