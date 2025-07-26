export declare const APP_CONFIG: {
    readonly FRONTEND_URL: string;
    readonly API_PORT: string;
    readonly API_PREFIX: "/api";
    readonly ALLOWED_ORIGINS: string[];
    readonly DEV_PORTS: {
        readonly FRONTEND: readonly ["5172", "5173", "5174", "5175"];
        readonly BACKEND: readonly ["3000", "3001", "3002", "3003", "3004"];
    };
    readonly SUPABASE: {
        readonly URL: string | undefined;
        readonly SERVICE_KEY: string | undefined;
        readonly ANON_KEY: string | undefined;
    };
    readonly STRIPE: {
        readonly SECRET_KEY: string | undefined;
        readonly WEBHOOK_SECRET: string | undefined;
        readonly PORTAL_RETURN_URL: string;
    };
    readonly EMAIL: {
        readonly RESEND_API_KEY: string | undefined;
        readonly FROM_ADDRESS: string;
        readonly SUPPORT_EMAIL: string;
    };
    readonly FEATURES: {
        readonly ENABLE_TELEMETRY: boolean;
        readonly ENABLE_DEBUG_LOGGING: boolean;
        readonly ENABLE_MAINTENANCE_MODE: boolean;
    };
    readonly IS_PRODUCTION: boolean;
    readonly IS_DEVELOPMENT: boolean;
    readonly IS_TEST: boolean;
    readonly DATABASE_URL: string | undefined;
    readonly JWT_SECRET: string | undefined;
    readonly JWT_EXPIRES_IN: string;
    readonly RATE_LIMIT: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: string | 100;
    };
};
export declare function validateConfig(): void;
export declare function getFrontendUrl(path?: string): string;
//# sourceMappingURL=app-config.d.ts.map