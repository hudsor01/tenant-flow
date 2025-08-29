import { SetMetadata } from '@nestjs/common'
export { Public } from './public.decorator'
export { Roles } from './roles.decorator'

// Simple decorators for the auth requirements (unified)
export const AdminOnly = () => SetMetadata('admin-only', true)
