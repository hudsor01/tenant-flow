import { SetMetadata } from '@nestjs/common'

export interface AuditLogOptions {
  action: string
  entity?: string
  sensitive?: boolean
}

export const AUDIT_LOG_KEY = 'audit_log'
export const AuditLog = (options: AuditLogOptions) => SetMetadata(AUDIT_LOG_KEY, options)