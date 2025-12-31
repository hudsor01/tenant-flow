'use client'

import * as React from 'react'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { toast } from 'sonner'
import type { BrandingInfo } from './template-types'

/** Maximum logo file size (500KB) */
const MAX_LOGO_SIZE = 500 * 1024

/** Allowed logo file types */
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']

interface BrandingEditorProps {
	branding: BrandingInfo
	onChange: (branding: BrandingInfo) => void
}

export function BrandingEditor({ branding, onChange }: BrandingEditorProps) {
	const handleLogoUpload = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0]
			if (!file) return

			if (file.size > MAX_LOGO_SIZE) {
				toast.error('Logo must be under 500KB')
				event.target.value = ''
				return
			}

			if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
				toast.error('Logo must be PNG, JPEG, or SVG')
				event.target.value = ''
				return
			}

			const reader = new FileReader()
			reader.onload = () => {
				onChange({
					...branding,
					logoUrl: typeof reader.result === 'string' ? reader.result : null
				})
			}
			reader.readAsDataURL(file)
		},
		[branding, onChange]
	)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Branding</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="company-name">Company name</Label>
					<Input
						id="company-name"
						value={branding.companyName}
						onChange={event =>
							onChange({ ...branding, companyName: event.target.value })
						}
						placeholder="Property Management LLC"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="brand-color">Primary color</Label>
					<div className="flex items-center gap-3">
						<Input
							id="brand-color"
							type="color"
							value={branding.primaryColor}
							onChange={event =>
								onChange({
									...branding,
									primaryColor: event.target.value
								})
							}
							className="h-10 w-16 p-1"
						/>
						<span className="text-sm text-muted-foreground">
							Used for headers and callouts
						</span>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="logo-upload">Logo upload</Label>
					<Input
						id="logo-upload"
						type="file"
						accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
						onChange={handleLogoUpload}
					/>
					{branding.logoUrl ? (
						<img
							src={branding.logoUrl}
							alt="Uploaded logo preview"
							className="h-16 w-auto rounded border"
						/>
					) : (
						<p className="text-sm text-muted-foreground">
							Upload a logo to embed in the PDF header.
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
