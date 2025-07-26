import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { createAppRouter } from './app-router';
export type AppRouter = ReturnType<typeof createAppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export interface AppRouterInterface {
    auth: AppRouter['auth'];
    properties: AppRouter['properties'];
    tenants: AppRouter['tenants'];
    maintenance: AppRouter['maintenance'];
    units: AppRouter['units'];
    leases: AppRouter['leases'];
    subscriptions: AppRouter['subscriptions'];
}
//# sourceMappingURL=app-router.types.d.ts.map