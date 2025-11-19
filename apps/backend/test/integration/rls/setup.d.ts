import { type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@repo/shared/types/supabase';
export interface TestCredentials {
    email: string;
    password: string;
    user_type: 'OWNER' | 'TENANT';
}
export declare const TEST_USERS: {
    readonly OWNER_A: {
        readonly email: string;
        readonly password: string;
        readonly user_type: "OWNER";
    };
    readonly OWNER_B: {
        readonly email: string;
        readonly password: string;
        readonly user_type: "OWNER";
    };
    readonly TENANT_A: {
        readonly email: string;
        readonly password: string;
        readonly user_type: "TENANT";
    };
    readonly TENANT_B: {
        readonly email: string;
        readonly password: string;
        readonly user_type: "TENANT";
    };
};
export interface AuthenticatedTestClient {
    client: SupabaseClient<Database>;
    user_id: string;
    email: string;
    user_type: 'OWNER' | 'TENANT';
    accessToken: string;
}
export declare function authenticateAs(credentials: TestCredentials): Promise<AuthenticatedTestClient>;
export declare function getServiceuser_typeClient(): SupabaseClient<Database>;
export declare function cleanupTestData(serviceClient: SupabaseClient<Database>, resourceIds: {
    properties?: string[];
    tenants?: string[];
    leases?: string[];
    payments?: string[];
    units?: string[];
}): Promise<void>;
export declare function expectEmptyResult<T>(data: T[] | null, context: string): void;
export declare function expectPermissionError(error: any, context: string): void;
export declare function ensureTestLease(owner_id: string, tenant_id: string): Promise<string>;
//# sourceMappingURL=setup.d.ts.map