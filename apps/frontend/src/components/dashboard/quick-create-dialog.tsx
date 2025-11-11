'use client'

import { Building2, FileText, UserPlus, Wrench } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '#components/ui/button'
import {
	CrudDialog,
	CrudDialogContent,
	CrudDialogHeader,
	CrudDialogTitle,
	CrudDialogDescription,
	CrudDialogBody
} from '#components/ui/crud-dialog'
import { useModalStore } from '#stores/modal-store'

const QUICK_CREATE_OPTIONS = [
	{
		title: 'Property',
		description: 'Add a new property to your portfolio',
		icon: Building2,
		href: '/manage/properties/new'
	},
	{
		title: 'Tenant',
		description: 'Onboard a new tenant',
		icon: UserPlus,
		href: '/manage/tenants/new'
	},
	{
		title: 'Lease',
		description: 'Create a new lease agreement',
		icon: FileText,
		href: '/manage/leases'
	},
	{
		title: 'Maintenance',
		description: 'Log a maintenance request',
		icon: Wrench,
		href: '/manage/maintenance/new'
	}
] as const

export function QuickCreateDialog() {
	const router = useRouter()
	const { closeModal } = useModalStore()

	const modalId = 'quick-create'

	const handleOptionClick = (href: string) => {
		closeModal(modalId)
		router.push(href)
	}

	return (
		<CrudDialog mode="create" modalId={modalId}>
			<CrudDialogContent>
				<CrudDialogHeader>
					<CrudDialogTitle>Quick Create</CrudDialogTitle>
					<CrudDialogDescription>
						Choose what you'd like to create
					</CrudDialogDescription>
				</CrudDialogHeader>
				<CrudDialogBody>
					<div className="grid gap-3">
						{QUICK_CREATE_OPTIONS.map(option => (
							<Button
								key={option.title}
								variant="outline"
								className="h-auto justify-start gap-4 p-4 text-left"
								onClick={() => handleOptionClick(option.href)}
							>
								<option.icon className="size-8 shrink-0 text-primary" />
								<div className="flex flex-col gap-1">
									<span className="font-semibold">{option.title}</span>
									<span className="text-xs text-muted-foreground">
										{option.description}
									</span>
								</div>
							</Button>
						))}
					</div>
				</CrudDialogBody>
			</CrudDialogContent>
		</CrudDialog>
	)
}
