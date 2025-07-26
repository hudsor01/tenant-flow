import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService {
    private configService;
    private _supabase;
    constructor(configService: ConfigService);
    private get supabase();
    getClient(): SupabaseClient;
}
//# sourceMappingURL=supabase.service.d.ts.map