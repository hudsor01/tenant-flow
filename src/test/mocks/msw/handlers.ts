import { supabaseAuthHandlers } from './handlers/supabase-auth'
import { propertyHandlers } from './handlers/properties'
import { tenantHandlers } from './handlers/tenants'
import { leaseHandlers } from './handlers/leases'
import { maintenanceHandlers } from './handlers/maintenance'
import { unitHandlers } from './handlers/units'
import { rpcHandlers } from './handlers/rpc'

export const handlers = [
	...supabaseAuthHandlers,
	...propertyHandlers,
	...tenantHandlers,
	...leaseHandlers,
	...maintenanceHandlers,
	...unitHandlers,
	...rpcHandlers
]
