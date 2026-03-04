import { z } from 'zod'

export const propertyInspectionSchema = z.object({
	propertyName: z.string().min(1, 'Property name is required'),
	propertyAddress: z.string().min(1, 'Property address is required'),
	inspectionType: z.enum(['pre', 'post']),
	inspectionDate: z.string().min(1, 'Inspection date is required'),
	inspectorName: z.string().min(1, 'Inspector name is required'),
	notes: z.string().optional(),
	checklist: z
		.array(
			z.object({
				label: z.string().min(1, 'Checklist item is required'),
				status: z.boolean()
			})
		)
		.optional()
})

export const rentalApplicationSchema = z.object({
	applicantName: z.string().min(1, 'Applicant name is required'),
	email: z.string().email('Valid email required'),
	phone: z.string().min(1, 'Phone is required'),
	currentAddress: z.string().min(1, 'Current address is required'),
	employer: z.string().min(1, 'Employer is required'),
	monthlyIncome: z.string().min(1, 'Monthly income is required'),
	backgroundCheck: z.boolean(),
	notes: z.string().optional(),
	references: z
		.array(
			z.object({
				name: z.string().min(1, 'Reference name is required'),
				relationship: z.string().min(1, 'Relationship is required'),
				phone: z.string().optional()
			})
		)
		.optional()
})

export const tenantNoticeSchema = z.object({
	noticeType: z.enum(['late-rent', 'lease-violation', 'move-out']),
	issueDate: z.string().min(1, 'Issue date is required'),
	dueDate: z.string().min(1, 'Cure date is required'),
	amountDue: z.string().min(1, 'Amount due is required'),
	tenantName: z.string().min(1, 'Tenant name is required'),
	propertyAddress: z.string().min(1, 'Property address is required'),
	details: z.string().min(1, 'Notice details are required')
})

export const maintenanceRequestSchema = z.object({
	propertyName: z.string().min(1, 'Property name is required'),
	unit: z.string().min(1, 'Unit is required'),
	requesterName: z.string().min(1, 'Requester name is required'),
	requesterPhone: z.string().min(1, 'Requester phone is required'),
	requesterEmail: z.string().email('Valid email required'),
	priority: z.enum(['low', 'medium', 'high', 'urgent']),
	preferredDate: z.string().min(1, 'Preferred date is required'),
	description: z.string().min(1, 'Issue description is required'),
	accessNotes: z.string().min(1, 'Access instructions are required')
})
