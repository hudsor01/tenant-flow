/**
 * Router output types for API responses
 * These types represent the structure of data returned from backend routes
 */
import type { MaintenanceRequest } from './maintenance';
import type { Property } from './properties';
import type { Tenant } from './tenants';
import type { Unit } from './properties';
import type { Lease } from './leases';
export interface MaintenanceRequestListOutput {
    requests: MaintenanceRequest[];
    total: number;
    page: number;
    limit: number;
}
export interface MaintenanceRequestDetailOutput {
    request: MaintenanceRequest;
}
export interface PropertyListOutput {
    properties: Property[];
    total: number;
    page: number;
    limit: number;
}
export interface RouterOutputs {
    maintenance: {
        list: MaintenanceRequestListOutput;
        detail: MaintenanceRequestDetailOutput;
    };
    properties: {
        list: PropertyListOutput;
    };
    tenants: {
        list: {
            tenants: Tenant[];
            total: number;
            page: number;
            limit: number;
        };
    };
    units: {
        list: {
            units: Unit[];
            total: number;
            page: number;
            limit: number;
        };
    };
    leases: {
        list: {
            leases: Lease[];
            total: number;
            page: number;
            limit: number;
        };
    };
}
//# sourceMappingURL=router.d.ts.map