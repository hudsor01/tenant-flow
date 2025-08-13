/**
 * Common utility types used across the application
 * These are fundamental TypeScript patterns that enhance type safety
 */

import type { ReactNode } from 'react'

// ============================================
// Base Utility Types
// ============================================

// Import utility types from shared package
export type {
  WithRequired as RequiredFields,
  WithOptional as PartialFields,
  LoadingState,
  PaginationMeta,
  DateRange,
  TimePeriod
} from '@repo/shared'

// Import pagination types directly from shared index since they're defined inline
import type { OffsetPaginationParams } from '@repo/shared'
export type { OffsetPaginationParams }

// Local alias for convenience
export type PaginationParams = OffsetPaginationParams

/**
 * Extract promise return type
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

/**
 * Function that may be async or sync
 */
export type MaybePromise<T> = T | Promise<T>

/**
 * Callback function with optional return
 */
export type Callback<T = void> = () => T
export type AsyncCallback<T = void> = () => Promise<T>
export type MaybeAsyncCallback<T = void> = Callback<T> | AsyncCallback<T>

// ============================================
// UI Component Common Types
// ============================================

/**
 * Standard size variants
 */
export type Size = 'sm' | 'md' | 'lg' | 'xl'

/**
 * Standard color variants
 */
export type Variant = 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost'

// LoadingState imported from shared package above

/**
 * Standard alignment options
 */
export type Alignment = 'left' | 'center' | 'right'

/**
 * Position types
 */
export type Position = 'top' | 'bottom' | 'left' | 'right'

/**
 * Basic component props that most components accept
 */
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
  id?: string
  'data-testid'?: string
}

/**
 * Props for components that can be disabled
 */
export interface DisablableProps {
  disabled?: boolean
}

/**
 * Props for components with loading states
 */
export interface LoadableProps {
  loading?: boolean
  loadingText?: string
}

// ============================================
// Form Common Types
// ============================================

/**
 * Standard form field sizes
 */
export type FieldSize = 'sm' | 'md' | 'lg'

/**
 * Form validation state
 */
export type ValidationState = 'valid' | 'invalid' | 'pending'

/**
 * Standard form operation modes
 */
export type FormMode = 'create' | 'edit' | 'view'

/**
 * Form field types
 */
export type FieldType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'tel' 
  | 'url' 
  | 'date' 
  | 'datetime-local'
  | 'time'
  | 'search'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'file'

// ============================================
// Data Fetching Types  
// ============================================

// PaginationParams imported from shared package above

/**
 * Sorting parameters
 */
export interface SortParams<T = string> {
  sortBy: T
  sortOrder: 'asc' | 'desc'
}

/**
 * Filter parameters
 */
export interface FilterParams<T = Record<string, unknown>> {
  filters: T
}

/**
 * Search parameters
 */
export interface SearchParams {
  query: string
}

/**
 * Combined query parameters
 */
export type QueryParams<TSort = string, TFilter = Record<string, unknown>> = 
  & Partial<PaginationParams>
  & Partial<SortParams<TSort>>
  & Partial<FilterParams<TFilter>>
  & Partial<SearchParams>

// ============================================
// Error Types
// ============================================

// Import error types from shared package
export type {
  ErrorResponse,
  FieldError,
  FormErrors as ValidationErrors
} from '@repo/shared'

// ============================================
// Event Handler Types
// ============================================

/**
 * Standard event handler signatures
 */
export type ClickHandler = (event: React.MouseEvent) => void
export type SubmitHandler = (event: React.FormEvent) => void
export type ChangeHandler<T = string> = (value: T) => void
export type KeyboardHandler = (event: React.KeyboardEvent) => void
export type FocusHandler = (event: React.FocusEvent) => void

/**
 * Async event handlers
 */
export type AsyncClickHandler = (event: React.MouseEvent) => Promise<void>
export type AsyncSubmitHandler = (event: React.FormEvent) => Promise<void>
export type AsyncChangeHandler<T = string> = (value: T) => Promise<void>

// ============================================
// Selection Types
// ============================================

/**
 * Single selection
 */
export interface SingleSelection<T> {
  selected: T | null
  onSelect: (item: T) => void
}

/**
 * Multiple selection
 */
export interface MultipleSelection<T> {
  selected: T[]
  onSelect: (items: T[]) => void
  onToggleItem?: (item: T) => void
}

/**
 * Optional multiple selection
 */
export type OptionalMultipleSelection<T> = 
  | SingleSelection<T> 
  | MultipleSelection<T>

// ============================================
// Menu/Navigation Types
// ============================================

/**
 * Menu item structure
 */
export interface MenuItem {
  id: string
  label: string
  icon?: ReactNode
  href?: string
  onClick?: ClickHandler
  disabled?: boolean
  children?: MenuItem[]
}

/**
 * Navigation breadcrumb
 */
export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

// ============================================
// Modal/Dialog Types
// ============================================

/**
 * Basic modal control
 */
export interface ModalState {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

/**
 * Modal with data
 */
export interface ModalWithData<T> extends ModalState {
  data: T | null
  setData: (data: T | null) => void
  openWith: (data: T) => void
}

// ============================================
// Time/Date Types
// ============================================

// DateRange and TimePeriod imported from shared package above

/**
 * Optional date range
 */
export interface OptionalDateRange {
  start?: Date
  end?: Date
}

// ============================================
// File/Upload Types
// ============================================

/**
 * File upload status
 */
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

/**
 * File with upload metadata
 */
export interface FileWithMetadata {
  file: File
  id: string
  status: UploadStatus
  progress?: number
  error?: string
  url?: string
}

// ============================================
// Theme/Styling Types  
// ============================================

/**
 * Theme modes
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Color scheme
 */
export type ColorScheme = 'light' | 'dark'

/**
 * Responsive breakpoints
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'