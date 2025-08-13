/**
 * Dialog and modal component prop types
 * Centralizes all dialog-related component interfaces
 */

import type { ReactNode } from 'react'
import type { 
  BaseComponentProps,
  Size,
  ClickHandler
} from '../core/common'

// ============================================
// Base Dialog Props
// ============================================

/**
 * Base dialog props that all dialogs extend
 */
export interface BaseDialogProps extends BaseComponentProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  modal?: boolean
  closeOnEscape?: boolean
  closeOnOverlayClick?: boolean
}

/**
 * Dialog with size variants
 */
export interface SizedDialogProps extends BaseDialogProps {
  size?: Size | 'xs' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full'
}

/**
 * Dialog with positioning
 */
export interface PositionedDialogProps extends BaseDialogProps {
  position?: 'center' | 'top' | 'bottom'
  offsetY?: number
}

// ============================================
// Modal Dialog Props
// ============================================

/**
 * Standard modal dialog props
 */
export interface ModalDialogProps extends SizedDialogProps, PositionedDialogProps {
  title?: string
  description?: string
  showHeader?: boolean
  showFooter?: boolean
  showCloseButton?: boolean
  preventClose?: boolean
  backdrop?: 'blur' | 'transparent' | 'opaque'
  header?: ReactNode
  footer?: ReactNode
}

/**
 * Confirmation dialog props
 */
export interface ConfirmDialogProps extends BaseDialogProps {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive' | 'warning'
  loading?: boolean
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
}

/**
 * Alert dialog props
 */
export interface AlertDialogProps extends BaseDialogProps {
  title?: string
  message: string
  confirmLabel?: string
  variant?: 'info' | 'success' | 'warning' | 'error'
  onConfirm?: () => void
}

// ============================================
// Entity Dialog Props
// ============================================

/**
 * Property dialog props
 */
export interface PropertyDialogProps extends ModalDialogProps {
  propertyId?: string
  mode?: 'create' | 'edit' | 'view'
  onSuccess?: (property: unknown) => void
  onDelete?: (propertyId: string) => void
}

/**
 * Tenant dialog props
 */
export interface TenantDialogProps extends ModalDialogProps {
  tenantId?: string
  propertyId?: string
  mode?: 'create' | 'edit' | 'view'
  onSuccess?: (tenant: unknown) => void
  onDelete?: (tenantId: string) => void
}

/**
 * Unit dialog props
 */
export interface UnitDialogProps extends ModalDialogProps {
  unitId?: string
  propertyId: string
  mode?: 'create' | 'edit' | 'view'
  onSuccess?: (unit: unknown) => void
  onDelete?: (unitId: string) => void
}

/**
 * Lease dialog props
 */
export interface LeaseDialogProps extends ModalDialogProps {
  leaseId?: string
  tenantId?: string
  unitId?: string
  propertyId?: string
  mode?: 'create' | 'edit' | 'view'
  onSuccess?: (lease: unknown) => void
  onDelete?: (leaseId: string) => void
}

/**
 * Maintenance request dialog props
 */
export interface MaintenanceRequestDialogProps extends ModalDialogProps {
  requestId?: string
  propertyId?: string
  unitId?: string
  tenantId?: string
  mode?: 'create' | 'edit' | 'view'
  onSuccess?: (request: unknown) => void
  onDelete?: (requestId: string) => void
}

// ============================================
// Specialized Dialog Props
// ============================================

/**
 * Image gallery dialog props
 */
export interface ImageGalleryDialogProps extends BaseDialogProps {
  images: Array<{
    id: string
    url: string
    alt?: string
    title?: string
  }>
  currentIndex?: number
  onIndexChange?: (index: number) => void
  showThumbnails?: boolean
  showCounter?: boolean
  allowDownload?: boolean
}

/**
 * File picker dialog props
 */
export interface FilePickerDialogProps extends ModalDialogProps {
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxSize?: number
  onFilesSelected?: (files: File[]) => void
}

/**
 * Search dialog props
 */
export interface SearchDialogProps extends BaseDialogProps {
  placeholder?: string
  initialQuery?: string
  onSearch?: (query: string) => void
  onResultSelect?: (result: unknown) => void
  loading?: boolean
  results?: unknown[]
  emptyMessage?: string
}

// ============================================
// Dialog Component Props
// ============================================

/**
 * Dialog header props
 */
export interface DialogHeaderProps extends BaseComponentProps {
  title?: string
  description?: string
  showCloseButton?: boolean
  onClose?: () => void
  icon?: ReactNode
}

/**
 * Dialog content props
 */
export interface DialogContentProps extends BaseComponentProps {
  scrollable?: boolean
  maxHeight?: string | number
  padding?: boolean
}

/**
 * Dialog footer props
 */
export interface DialogFooterProps extends BaseComponentProps {
  justification?: 'start' | 'center' | 'end' | 'between'
  spacing?: 'tight' | 'normal' | 'loose'
}

/**
 * Dialog actions props
 */
export interface DialogActionsProps extends BaseComponentProps {
  confirmLabel?: string
  cancelLabel?: string
  showCancel?: boolean
  confirmVariant?: 'default' | 'primary' | 'destructive'
  loading?: boolean
  disabled?: boolean
  onConfirm?: ClickHandler
  onCancel?: ClickHandler
}

// ============================================
// Drawer Props (Side Panels)
// ============================================

/**
 * Drawer/side panel props
 */
export interface DrawerProps extends BaseDialogProps {
  side?: 'left' | 'right' | 'top' | 'bottom'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  overlay?: boolean
  resizable?: boolean
  collapsible?: boolean
  persistent?: boolean
}

/**
 * Sheet dialog props (mobile-friendly drawer)
 */
export interface SheetProps extends DrawerProps {
  snapPoints?: number[]
  defaultSnap?: number
  expandOnContentDrag?: boolean
  closeOnSwipe?: boolean
}

// ============================================
// Popover Props
// ============================================

/**
 * Popover dialog props
 */
export interface PopoverProps extends BaseComponentProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
  content: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  offset?: number
  arrow?: boolean
  modal?: boolean
}

/**
 * Tooltip props (simple popover)
 */
export interface TooltipProps extends BaseComponentProps {
  content: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  offset?: number
  delay?: number
  disabled?: boolean
  arrow?: boolean
}

// ============================================
// Context Menu Props
// ============================================

/**
 * Context menu props
 */
export interface ContextMenuProps extends BaseComponentProps {
  trigger: ReactNode
  items: ContextMenuItem[]
  onItemSelect?: (item: ContextMenuItem) => void
}

/**
 * Context menu item
 */
export interface ContextMenuItem {
  id: string
  label: string
  icon?: ReactNode
  shortcut?: string
  disabled?: boolean
  destructive?: boolean
  separator?: boolean
  submenu?: ContextMenuItem[]
  onSelect?: () => void
}