'use client'

import { useMutation } from '@tanstack/react-query'
import { ClipboardCheck, Download, FileText, Table } from 'lucide-react'
import { type FormEvent, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '#components/ui/button'
import { createClient } from '#lib/supabase/client'

type ResourceType = 'checklist' | 'guide' | 'spreadsheet'

interface LeadMagnetCtaProps {
	title: string
	description: string
	resourceType: ResourceType
	downloadUrl: string
}

const resourceIcons: Record<ResourceType, typeof Download> = {
	checklist: ClipboardCheck,
	guide: FileText,
	spreadsheet: Table,
}

export function LeadMagnetCta({
	title,
	description,
	resourceType,
	downloadUrl,
}: LeadMagnetCtaProps) {
	const inputRef = useRef<HTMLInputElement>(null)
	const [unlocked, setUnlocked] = useState(false)
	const Icon = resourceIcons[resourceType]

	const mutation = useMutation({
		mutationFn: async (email: string) => {
			const supabase = createClient()
			const { error } = await supabase.functions.invoke(
				'newsletter-subscribe',
				{
					body: { email },
				}
			)
			if (error) throw error
		},
		onSuccess: () => {
			setUnlocked(true)
			toast.success('Your download is ready below.')
		},
		onError: () => {
			toast.error('Could not process your request. Please try again.')
		},
	})

	function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const email = inputRef.current?.value?.trim()
		if (email) {
			mutation.mutate(email)
		}
	}

	return (
		<div className="not-prose my-12 rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 via-primary/[0.02] to-transparent p-8">
			<div className="flex flex-col gap-4">
				<div className="flex items-center gap-2">
					<Icon className="size-5 text-primary" />
					<p className="text-sm font-semibold uppercase tracking-wider text-primary">
						Free {resourceType}
					</p>
				</div>
				<h3 className="text-2xl font-bold text-foreground">{title}</h3>
				<p className="text-muted-foreground leading-relaxed">{description}</p>

				{unlocked ? (
					<div className="mt-2">
						<Button asChild>
							<a href={downloadUrl} target="_blank" rel="noopener noreferrer">
								<Download className="size-4 mr-2" />
								Get Free Resource
							</a>
						</Button>
					</div>
				) : (
					<form
						onSubmit={handleSubmit}
						className="mt-2 flex gap-2"
						aria-label="Download resource"
					>
						<input
							ref={inputRef}
							type="email"
							placeholder="your@email.com"
							required
							className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						/>
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending ? 'Sending...' : 'Get Free Download'}
						</Button>
					</form>
				)}
			</div>
		</div>
	)
}
