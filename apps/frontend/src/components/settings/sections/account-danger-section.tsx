'use client'

import { useState } from 'react'
import { Download, Loader2, AlertTriangle, Trash2 } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '#lib/supabase/client'
import { API_BASE_URL } from '#lib/api-config'

export function AccountDangerSection() {
	const supabase = createClient()
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [deleteConfirmText, setDeleteConfirmText] = useState('')

	const exportData = useMutation({
		mutationFn: async () => {
			const token = (await supabase.auth.getSession()).data.session?.access_token
			if (!token) throw new Error('Not authenticated')

			const response = await fetch(`${API_BASE_URL}/users/me/export`, {
				headers: { Authorization: `Bearer ${token}` }
			})
			if (!response.ok) throw new Error('Failed to export data')

			const blob = await response.blob()
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `tenantflow-data-export-${new Date().toISOString().split('T')[0]}.json`
			a.click()
			URL.revokeObjectURL(url)
		},
		onSuccess: () => toast.success('Data export downloaded successfully'),
		onError: () => toast.error('Failed to export data. Please try again.')
	})

	const deleteAccount = useMutation({
		mutationFn: async () => {
			const token = (await supabase.auth.getSession()).data.session?.access_token
			if (!token) throw new Error('Not authenticated')

			const response = await fetch(`${API_BASE_URL}/users/me`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			})
			if (!response.ok) throw new Error('Failed to delete account')
		},
		onSuccess: async () => {
			toast.success('Account deleted. Signing you out...')
			await supabase.auth.signOut()
			window.location.href = '/login'
		},
		onError: () => toast.error('Failed to delete account. Please contact support.')
	})

	return (
		<>
			{/* Data & Privacy */}
			<BlurFade delay={0.45} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-1 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Your Data
					</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Under GDPR and CCPA, you have the right to access and download a copy of your personal data.
					</p>
					<button
						onClick={() => exportData.mutate()}
						disabled={exportData.isPending}
						className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
					>
						{exportData.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Download className="h-4 w-4" />
						)}
						Download My Data
					</button>
				</section>
			</BlurFade>

			{/* Danger Zone */}
			<BlurFade delay={0.5} inView>
				<section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
					<h3 className="mb-1 text-sm font-medium text-destructive uppercase tracking-wider">
						Danger Zone
					</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Permanently delete your account and all associated data. This action cannot be undone.
					</p>
					{!showDeleteDialog ? (
						<button
							onClick={() => setShowDeleteDialog(true)}
							className="flex items-center gap-2 rounded-lg border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
						>
							<Trash2 className="h-4 w-4" />
							Delete Account
						</button>
					) : (
						<div className="space-y-4 rounded-lg border border-destructive/30 bg-background p-4">
							<div className="flex items-start gap-3">
								<AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
								<div>
									<p className="text-sm font-medium text-destructive">
										This will permanently delete your account
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										All your properties, tenants, leases, and payment history will be deactivated. This cannot be reversed.
									</p>
								</div>
							</div>
							<div className="grid gap-2">
								<label htmlFor="deleteConfirm" className="text-sm font-medium">
									Type <span className="font-mono font-bold">DELETE</span> to confirm
								</label>
								<input
									id="deleteConfirm"
									type="text"
									value={deleteConfirmText}
									onChange={e => setDeleteConfirmText(e.target.value)}
									placeholder="DELETE"
									className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/20 focus:border-destructive transition-all"
								/>
							</div>
							<div className="flex gap-3">
								<button
									onClick={() => {
										setShowDeleteDialog(false)
										setDeleteConfirmText('')
									}}
									className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={() => deleteAccount.mutate()}
									disabled={deleteConfirmText !== 'DELETE' || deleteAccount.isPending}
									className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
								>
									{deleteAccount.isPending ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Trash2 className="h-4 w-4" />
									)}
									Permanently Delete Account
								</button>
							</div>
						</div>
					)}
				</section>
			</BlurFade>
		</>
	)
}
