import type { DynamicModule, Provider, Type } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
export interface TestEnvironmentConfig {
    database: {
        url: string;
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
    };
    supabase: {
        url: string;
        publishableKey: string;
        serviceuser_typeKey: string;
        jwtSecret: string;
    };
    stripe: {
        secretKey: string;
        webhookSecret: string;
        publishableKey: string;
    };
    email: {
        resendApiKey: string;
    };
}
export declare function getTestEnvironment(): 'units' | 'integration' | 'e2e';
export declare function getTestDatabaseConfig(): TestEnvironmentConfig['database'];
export declare function getTestSupabaseConfig(): TestEnvironmentConfig['supabase'];
export declare function getTestStripeConfig(): TestEnvironmentConfig['stripe'];
export declare function getTestEmailConfig(): TestEnvironmentConfig['email'];
export declare function getTestEnvironmentConfig(): TestEnvironmentConfig;
export declare function createTestModule(moduleMetadata: {
    imports?: Array<Type<unknown> | DynamicModule>;
    controllers?: Array<Type<unknown>>;
    providers?: Array<Provider>;
    exports?: Array<Type<unknown> | DynamicModule | Provider>;
}): Promise<TestingModule>;
export declare class TestDatabaseUtils {
    private static readonly logger;
    static cleanDatabase(): Promise<void>;
    static seedTestData(): Promise<void>;
    static setupTestDatabase(): Promise<void>;
}
//# sourceMappingURL=test-environment.d.ts.map