/**
 * Navigation Types
 * 
 * Shared type definitions for all navigation components.
 */

import type * as React from "react"

export interface NavItem {
  id: string
  label: string
  href?: string
  icon?: React.ReactNode
  badge?: string | number
  description?: string
  children?: NavItem[]
  external?: boolean
  disabled?: boolean
}

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

export interface TabItem {
  id: string
  label: string
  href?: string
  icon?: React.ReactNode
  badge?: string | number
  disabled?: boolean
}