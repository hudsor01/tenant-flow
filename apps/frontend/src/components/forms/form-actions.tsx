/**
 * Form Action Components - Server Components with Client Interactivity
 * 
 * Reusable form action patterns (save, cancel, submit, etc.)
 * Server components with client islands for specific interactions
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Save, X, Plus, Trash2, Upload } from 'lucide-react'

// ============================================================================
// FORM ACTIONS BAR
// ============================================================================

interface FormActionsProps {
  children: React.ReactNode
  className?: string
  position?: 'left' | 'right' | 'center' | 'between'
  sticky?: boolean
}

export function FormActions({
  children,
  className,
  position = 'right',
  sticky = false
}: FormActionsProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 pt-6 border-t",
      position === 'left' && "justify-start",
      position === 'right' && "justify-end",
      position === 'center' && "justify-center",
      position === 'between' && "justify-between",
      sticky && "sticky bottom-0 bg-background/80 backdrop-blur-sm p-4 -m-4",
      className
    )}>
      {children}
    </div>
  )
}

// ============================================================================
// SAVE ACTIONS
// ============================================================================

interface SaveActionsProps {
  onSave?: () => void
  onSaveAndContinue?: () => void
  onCancel?: () => void
  isLoading?: boolean
  saveText?: string
  cancelText?: string
  saveAndContinueText?: string
  disabled?: boolean
  className?: string
}

export function SaveActions({
  onSave,
  onSaveAndContinue,
  onCancel,
  isLoading = false,
  saveText = "Save",
  cancelText = "Cancel", 
  saveAndContinueText = "Save & Continue",
  disabled = false,
  className
}: SaveActionsProps) {
  return (
    <FormActions className={className}>
      {onCancel && (
        <Button 
          type="button"
          variant="outline" 
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="w-4 h-4 mr-2" />
          {cancelText}
        </Button>
      )}
      
      {onSave && (
        <Button
          type="submit"
          variant="outline"
          onClick={onSave}
          disabled={disabled || isLoading}
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Saving..." : saveText}
        </Button>
      )}

      {onSaveAndContinue && (
        <Button
          type="submit"
          onClick={onSaveAndContinue}
          disabled={disabled || isLoading}
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Saving..." : saveAndContinueText}
        </Button>
      )}
    </FormActions>
  )
}

// ============================================================================
// CRUD ACTIONS
// ============================================================================

interface CrudActionsProps {
  onAdd?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onUpload?: () => void
  addText?: string
  editText?: string
  deleteText?: string
  uploadText?: string
  isLoading?: boolean
  className?: string
}

export function CrudActions({
  onAdd,
  onEdit,
  onDelete,
  onUpload,
  addText = "Add",
  editText = "Edit",
  deleteText = "Delete",
  uploadText = "Upload",
  isLoading = false,
  className
}: CrudActionsProps) {
  return (
    <FormActions position="left" className={className}>
      {onAdd && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={isLoading}
        >
          <Plus className="w-4 h-4 mr-2" />
          {addText}
        </Button>
      )}

      {onUpload && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onUpload}
          disabled={isLoading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploadText}
        </Button>
      )}

      {onEdit && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEdit}
          disabled={isLoading}
        >
          {editText}
        </Button>
      )}

      {onDelete && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={isLoading}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {deleteText}
        </Button>
      )}
    </FormActions>
  )
}