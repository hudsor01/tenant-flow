'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode, FormEvent } from 'react'

import { cn } from '#lib/utils'
import { useModalStore } from '#stores/modal-store'
import {
	Dialog as BaseDialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
	DialogOverlay,
	DialogPortal,
	DialogTrigger,
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '#components/ui/dialog'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerOverlay,
	DrawerPortal,
	DrawerTitle,
	DrawerTrigger
} from '#components/ui/drawer'
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger
} from '#components/ui/sheet'

export type CrudMode = 'create' | 'read' | 'edit' | 'delete'
export type CrudDialogVariant = 'dialog' | 'alert' | 'confirm' | 'drawer' | 'sheet'

export interface CrudDialogProps
	extends Omit<React.ComponentProps<typeof DialogPrimitive.Root>, 'children'> {
	/**
	 * CRUD operation mode
	 */
	mode: CrudMode
	/**
	 * Unique modal ID for the modal store (required for read/edit/delete modes)
	 */
	modalId?: string
	/**
	 * Dialog content children
	 */
	children: ReactNode
	/**
	 * Custom close handler
	 */
	onClose?: () => void
	/**
	 * Whether to persist the modal through navigation
	 */
	persistThroughNavigation?: boolean
	/**
	 * Modal variant (dialog, alert, confirm, drawer, sheet)
	 */
	variant?: CrudDialogVariant
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component types vary by variant, strict typing not feasible
type VariantComponent = React.ComponentType<any>

type VariantComponents = {
	Root: VariantComponent
	Content?: VariantComponent
	Header?: VariantComponent
	Title?: VariantComponent
	Description?: VariantComponent
	Footer?: VariantComponent
	Close?: VariantComponent
	Overlay?: VariantComponent
	Portal?: VariantComponent
	Trigger?: VariantComponent
	Action?: VariantComponent
	Cancel?: VariantComponent
}

const variantComponentMap: Record<CrudDialogVariant, VariantComponents> = {
	dialog: {
		Root: DialogPrimitive.Root,
		Content: DialogContent,
		Header: DialogHeader,
		Title: DialogTitle,
		Description: DialogDescription,
		Footer: DialogFooter,
		Close: DialogClose,
		Overlay: DialogOverlay,
		Portal: DialogPortal,
		Trigger: DialogTrigger
	},
	alert: {
		Root: AlertDialog,
		Content: AlertDialogContent,
		Header: AlertDialogHeader,
		Title: AlertDialogTitle,
		Description: AlertDialogDescription,
		Footer: AlertDialogFooter,
		Close: AlertDialogCancel,
		Trigger: AlertDialogTrigger,
		Action: AlertDialogAction,
		Cancel: AlertDialogCancel
	},
	confirm: {
		Root: AlertDialog,
		Content: AlertDialogContent,
		Header: AlertDialogHeader,
		Title: AlertDialogTitle,
		Description: AlertDialogDescription,
		Footer: AlertDialogFooter,
		Close: AlertDialogCancel,
		Trigger: AlertDialogTrigger,
		Action: AlertDialogAction,
		Cancel: AlertDialogCancel
	},
	drawer: {
		Root: Drawer,
		Content: DrawerContent,
		Header: DrawerHeader,
		Title: DrawerTitle,
		Description: DrawerDescription,
		Footer: DrawerFooter,
		Close: DrawerClose,
		Overlay: DrawerOverlay,
		Portal: DrawerPortal,
		Trigger: DrawerTrigger
	},
	sheet: {
		Root: Sheet,
		Content: SheetContent,
		Header: SheetHeader,
		Title: SheetTitle,
		Description: SheetDescription,
		Footer: SheetFooter,
		Close: SheetClose,
		Trigger: SheetTrigger
	}
}

const VariantContext = React.createContext<VariantComponents>(variantComponentMap.dialog)
const ControlContext = React.createContext<{ requestClose: () => void }>({ requestClose: () => {} })

/**
 * CrudDialogBody - Container for dialog form content
 */
function CrudDialogBody({ className, ...props }: React.ComponentProps<'div'>) {
	return <div className={cn('space-y-4', className)} {...props} />
}
CrudDialogBody.displayName = 'CrudDialogBody'

/**
 * CrudDialogForm - Lightweight form helper that auto-closes on successful submit
 */
function CrudDialogForm({
	onSubmit,
	closeOnSubmit = true,
	...props
}: React.ComponentProps<'form'> & { closeOnSubmit?: boolean }) {
	const { requestClose } = React.useContext(ControlContext)

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (onSubmit) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- FormEvent typing issue with generic form submit handler
			await onSubmit(event as any)
		}
		if (closeOnSubmit) {
			requestClose()
		}
	}

	return <form onSubmit={handleSubmit} {...props} />
}
CrudDialogForm.displayName = 'CrudDialogForm'

const useVariantComponents = () => React.useContext(VariantContext)

const createVariantComponent = <K extends keyof VariantComponents>(
	key: K,
	label: string
) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic component factory requires flexible typing
	const Component = React.forwardRef<any, any>((props, ref) => {
		const components = useVariantComponents()
		const ComponentForVariant = components[key] ?? variantComponentMap.dialog[key]
		if (!ComponentForVariant) return null
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Variant components have heterogeneous prop types
		return <ComponentForVariant ref={ref} {...(props as any)} />
	})
	Component.displayName = label
	return Component
}

const CrudDialogContent = createVariantComponent('Content', 'CrudDialogContent')
const CrudDialogHeader = createVariantComponent('Header', 'CrudDialogHeader')
const CrudDialogTitle = createVariantComponent('Title', 'CrudDialogTitle')
const CrudDialogDescription = createVariantComponent('Description', 'CrudDialogDescription')
const CrudDialogFooter = createVariantComponent('Footer', 'CrudDialogFooter')
const CrudDialogClose = createVariantComponent('Close', 'CrudDialogClose')
const CrudDialogOverlay = createVariantComponent('Overlay', 'CrudDialogOverlay')
const CrudDialogPortal = createVariantComponent('Portal', 'CrudDialogPortal')
const CrudDialogTrigger = createVariantComponent('Trigger', 'CrudDialogTrigger')
const CrudDialogAction = createVariantComponent('Action', 'CrudDialogAction')
const CrudDialogCancel = createVariantComponent('Cancel', 'CrudDialogCancel')

/**
 * CrudDialog - Dialog with modal store integration and multi-variant support
 */
function CrudDialog({
	mode: _mode,
	modalId,
	children,
	onClose,
	persistThroughNavigation = false,
	variant = 'dialog',
	...rest
}: CrudDialogProps) {
	const router = useRouter()
	const { isModalOpen, closeModal } = useModalStore()

	const isModalMode = !!modalId
	const modalOpen = isModalMode ? isModalOpen(modalId) : undefined
	const wasEverOpenRef = useRef(false)

	const {
		onOpenChange: controlledOnOpenChange,
		open: controlledOpen,
		defaultOpen,
		...rootProps
	} = rest as DialogPrimitive.DialogProps

	useEffect(() => {
		if (!isModalMode) return
		if (modalOpen) {
			wasEverOpenRef.current = true
			return
		}

		if (wasEverOpenRef.current) {
			onClose?.()
			if (!persistThroughNavigation) {
				router.back()
			}
		}
	}, [isModalMode, modalOpen, onClose, persistThroughNavigation, router])

	const handleOpenChange = (openState: boolean) => {
		controlledOnOpenChange?.(openState)
		if (!openState) {
			if (isModalMode && modalId) {
				closeModal(modalId)
			} else {
				onClose?.()
			}
		}
	}

	const requestClose = () => {
		if (isModalMode && modalId) {
			closeModal(modalId)
		} else {
			controlledOnOpenChange?.(false)
			onClose?.()
		}
	}

	const components = useMemo(
		() => variantComponentMap[variant] ?? variantComponentMap.dialog,
		[variant]
	)
	const RootComponent = components.Root ?? BaseDialog

	const openProp = isModalMode ? modalOpen : controlledOpen
	const defaultOpenProp = isModalMode ? undefined : defaultOpen

	return (
		<VariantContext.Provider value={components}>
			<ControlContext.Provider value={{ requestClose }}>
				<RootComponent
					open={openProp}
					defaultOpen={defaultOpenProp}
					onOpenChange={handleOpenChange}
					{...rootProps}
				>
					{children}
				</RootComponent>
			</ControlContext.Provider>
		</VariantContext.Provider>
	)
}
CrudDialog.displayName = 'CrudDialog'

// Export CrudDialog (the unique component with modal store integration)
export { CrudDialog }

// Export helpers
export { CrudDialogBody, CrudDialogForm }

// Variant-aware component exports
export {
	CrudDialogContent,
	CrudDialogHeader,
	CrudDialogTitle,
	CrudDialogDescription,
	CrudDialogFooter,
	CrudDialogClose,
	CrudDialogOverlay,
	CrudDialogPortal,
	CrudDialogTrigger,
	CrudDialogAction,
	CrudDialogCancel
}

// Also re-export with Dialog prefix for compatibility with existing imports
export {
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
	DialogOverlay,
	DialogPortal,
	DialogTrigger
}

// Re-export CrudDialog as Dialog for consumers expecting that name
export { CrudDialog as Dialog }
// Re-export CrudDialogBody as DialogBody
export { CrudDialogBody as DialogBody }
