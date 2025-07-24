import { useState, useCallback, useMemo } from 'react'

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
 * Modal state with editing entity management
 * Common pattern for edit modals that work with entities
 */
export function useEditModalState<T = unknown>(initialState = false) {
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

/**
 * Manages the state for multiple modals, ensuring only one can be open at a time.
 * This is useful for pages with multiple independent modals.
 */
export function useMultiModalState<T extends string>(modalKeys: readonly T[]) {
    const [openModal, setOpenModal] = useState<T | null>(null)

    const modals = useMemo(() => {
        return modalKeys.reduce(
            (acc, key) => {
                acc[key] = {
                    isOpen: openModal === key,
                    open: () => setOpenModal(key),
                    close: () => setOpenModal(null),
                }
                return acc
            },
            {} as {
                [K in T]: {
                    isOpen: boolean
                    open: () => void
                    close: () => void
                }
            },
        )
    }, [modalKeys, openModal])

    return modals
}
