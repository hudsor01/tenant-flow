export interface ValidatedUser {
    id: string;
    email: string;
    name?: string;
    phone: string | null;
    bio: string | null;
    avatarUrl?: string;
    role: string;
    createdAt: string;
    updatedAt: string;
    emailVerified: boolean;
    supabaseId: string;
    stripeCustomerId: string | null;
}
export interface Context {
    req: Request;
    res: Response;
    user?: ValidatedUser;
}
export type AuthenticatedContext = Context & {
    user: ValidatedUser;
};
export interface RequestContext {
    requestId: string;
    tenantId?: string;
    userId?: string;
    startTime: number;
    path: string;
    method: string;
    ip: string;
}
export interface PerformanceMetrics {
    tenantId: string;
    avgResponseTime: number;
    errorCount: number;
    requestCount: number;
    lastUpdated: number;
}
//# sourceMappingURL=backend.d.ts.map