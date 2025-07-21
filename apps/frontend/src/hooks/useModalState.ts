import { useState, useCallback } from 'react'

/**
 * Generic modal state management hook
 * Consolidates duplicate modal state patterns across the codebase
 */
export function useModalState(initialState = false) {
    const [isOpen, setIsOpen] = useState(initialState)

    const open = useCallback(() => setIsOpen(true), [])
    const close = useCallback(() => setIsOpen(false), [])
    const toggle = useCallback(() => setIsOpen(prev => !prev), [])

    return {
        isOpen,
        open,
        close,
        toggle,
        setIsOpen
    }
}

/**
 * Multi-modal state management hook
 * For components that need to manage multiple modals
 */
export function useMultiModalState<T extends string>(
    modalNames: readonly T[]
): Record<T, ReturnType<typeof useModalState>> & {
    closeAll: () => void
    isAnyOpen: boolean
} {
    const modals = modalNames.reduce((acc, name) => {
        acc[name] = useModalState()
        return acc
    }, {} as Record<T, ReturnType<typeof useModalState>>)

    const closeAll = useCallback(() => {
        Object.values(modals).forEach(modal => {
            (modal as ReturnType<typeof useModalState>).close()
        })
    }, [modals])

    const isAnyOpen = Object.values(modals).some(modal => 
        (modal as ReturnType<typeof useModalState>).isOpen
    )

    return {
        ...modals,
        closeAll,
        isAnyOpen
    }
}

/**
 * Modal state with editing entity management
 * Common pattern for edit modals that work with entities
 */
export function useEditModalState<T = any>(initialState = false) {
    const [isOpen, setIsOpen] = useState(initialState)
    const [editingEntity, setEditingEntity] = useState<T | undefined>(undefined)

    const openForCreate = useCallback(() => {
        setEditingEntity(undefined)
        setIsOpen(true)
    }, [])

    const openForEdit = useCallback((entity: T) => {
        setEditingEntity(entity)
        setIsOpen(true)
    }, [])

    const close = useCallback(() => {
        setIsOpen(false)
        setEditingEntity(undefined)
    }, [])

    const isEditing = editingEntity !== undefined

    return {
        isOpen,
        editingEntity,
        isEditing,
        openForCreate,
        openForEdit,
        close,
        setIsOpen,
        setEditingEntity
    }
}