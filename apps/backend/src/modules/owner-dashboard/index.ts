/**
 * Owner Dashboard Module Exports
 *
 * Provides owner-specific dashboard functionality with modular organization:
 * - Financial analytics
 * - Property performance
 * - Maintenance analytics
 * - Tenant statistics
 * - Reports and trends
 * - Dashboard analytics
 */

export { OwnerDashboardModule } from './owner-dashboard.module'
export { OwnerAuthGuard } from './guards/owner-auth.guard'
export { OwnerContextInterceptor } from './interceptors/owner-context.interceptor'
export { FileSizeValidationPipe } from './pipes/file-size-validation.pipe'
