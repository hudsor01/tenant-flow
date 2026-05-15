import { leaseHandlers } from "./handlers/leases";
import { maintenanceHandlers } from "./handlers/maintenance";
import { propertyHandlers } from "./handlers/properties";
import { rpcHandlers } from "./handlers/rpc";
import { supabaseAuthHandlers } from "./handlers/supabase-auth";
import { tenantHandlers } from "./handlers/tenants";
import { unitHandlers } from "./handlers/units";

export const handlers = [
	...supabaseAuthHandlers,
	...propertyHandlers,
	...tenantHandlers,
	...leaseHandlers,
	...maintenanceHandlers,
	...unitHandlers,
	...rpcHandlers,
];
