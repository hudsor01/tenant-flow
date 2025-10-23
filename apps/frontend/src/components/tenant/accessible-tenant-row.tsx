'use client'

import React from 'react'

export interface AccessibleTenantRowProps {
  children?: React.ReactNode
}

export function AccessibleTenantRow({ children }: AccessibleTenantRowProps) {
  return <div data-testid="accessible-tenant-row">{children}</div>
}

export default AccessibleTenantRow
