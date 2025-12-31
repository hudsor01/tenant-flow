import { useState, useCallback, useMemo } from 'react'
import type {
	GenerateLeaseProperty,
	GenerateLeaseTenant,
	LeaseTemplate,
	LeaseFormData
} from './types'
import type { TenantMode } from './lease-step-tenant'

// ============================================================================
// TYPES
// ============================================================================

export interface UseGenerateLeaseFormOptions {
	properties: GenerateLeaseProperty[]
	existingTenants: GenerateLeaseTenant[]
	templates: LeaseTemplate[]
	onGenerate: (data: LeaseFormData) => void
}

export interface UseGenerateLeaseFormReturn {
	// Step state
	currentStep: number
	isFirstStep: boolean
	isLastStep: boolean

	// Form data
	formData: Partial<LeaseFormData>
	setFormData: (data: Partial<LeaseFormData>) => void

	// Tenant mode (existing vs new)
	tenantMode: TenantMode
	setTenantMode: (mode: TenantMode) => void

	// Tenant search
	tenantSearch: string
	setTenantSearch: (search: string) => void

	// Selected entities (derived)
	selectedProperty: GenerateLeaseProperty | undefined
	selectedUnit: GenerateLeaseProperty['units'][0] | undefined
	selectedTenant: GenerateLeaseTenant | undefined
	selectedTemplate: LeaseTemplate | undefined

	// Navigation
	canProceed: boolean
	handleNext: () => void
	handleBack: () => void
	handleSubmit: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TOTAL_STEPS = 4

const DEFAULT_FORM_DATA: Partial<LeaseFormData> = {
	paymentDay: 1,
	lateFeeDays: 5,
	lateFeeAmount: 5000,
	gracePeriodDays: 3
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useGenerateLeaseForm - Custom hook for managing lease generation wizard state
 *
 * Features:
 * - Multi-step form state management
 * - Validation per step
 * - Derived entities (selected property, unit, tenant, template)
 * - Navigation controls
 */
export function useGenerateLeaseForm({
	properties,
	existingTenants,
	templates,
	onGenerate
}: UseGenerateLeaseFormOptions): UseGenerateLeaseFormReturn {
	// Step state
	const [currentStep, setCurrentStep] = useState(0)

	// Form data state
	const [formData, setFormData] =
		useState<Partial<LeaseFormData>>(DEFAULT_FORM_DATA)

	// Tenant mode state
	const [tenantMode, setTenantMode] = useState<TenantMode>('existing')

	// Tenant search state
	const [tenantSearch, setTenantSearch] = useState('')

	// Derived: Selected entities
	const selectedProperty = useMemo(
		() => properties.find(p => p.id === formData.propertyId),
		[properties, formData.propertyId]
	)

	const selectedUnit = useMemo(
		() => selectedProperty?.units.find(u => u.id === formData.unitId),
		[selectedProperty, formData.unitId]
	)

	const selectedTenant = useMemo(
		() => existingTenants.find(t => t.id === formData.tenantId),
		[existingTenants, formData.tenantId]
	)

	const selectedTemplate = useMemo(
		() => templates.find(t => t.id === formData.templateId),
		[templates, formData.templateId]
	)

	// Step navigation helpers
	const isFirstStep = currentStep === 0
	const isLastStep = currentStep === TOTAL_STEPS - 1

	// Validation: Can proceed to next step?
	const canProceed = useMemo(() => {
		switch (currentStep) {
			case 0:
				return Boolean(formData.propertyId && formData.unitId)
			case 1:
				return tenantMode === 'existing'
					? Boolean(formData.tenantId)
					: Boolean(formData.newTenant?.name && formData.newTenant?.email)
			case 2:
				return Boolean(
					formData.templateId && formData.startDate && formData.rentAmount
				)
			default:
				return true
		}
	}, [currentStep, formData, tenantMode])

	// Navigation handlers
	const handleNext = useCallback(() => {
		if (currentStep < TOTAL_STEPS - 1) {
			setCurrentStep(prev => prev + 1)
		}
	}, [currentStep])

	const handleBack = useCallback(() => {
		if (currentStep > 0) {
			setCurrentStep(prev => prev - 1)
		}
	}, [currentStep])

	const handleSubmit = useCallback(() => {
		if (
			formData.propertyId &&
			formData.unitId &&
			formData.startDate &&
			formData.endDate
		) {
			onGenerate(formData as LeaseFormData)
		}
	}, [formData, onGenerate])

	return {
		// Step state
		currentStep,
		isFirstStep,
		isLastStep,

		// Form data
		formData,
		setFormData,

		// Tenant mode
		tenantMode,
		setTenantMode,

		// Tenant search
		tenantSearch,
		setTenantSearch,

		// Selected entities
		selectedProperty,
		selectedUnit,
		selectedTenant,
		selectedTemplate,

		// Navigation
		canProceed,
		handleNext,
		handleBack,
		handleSubmit
	}
}
