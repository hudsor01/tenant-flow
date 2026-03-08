'use client'

import { useMutation } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { type FormEvent, useRef } from 'react'
import { toast } from 'sonner'

import { createClient } from '#lib/supabase/client'
import { cn } from '#lib/utils'

interface NewsletterSignupProps {
	className?: string
}

export function NewsletterSignup({ className }: NewsletterSignupProps) {
	const inputRef = useRef<HTMLInputElement>(null)

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
			toast.success('Subscribed! Check your inbox.')
			if (inputRef.current) {
				inputRef.current.value = ''
			}
		},
		onError: () => {
			toast.error('Could not subscribe. Please try again.')
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
		<div
			className={cn(
				'flex flex-col gap-3 rounded-lg border border-border bg-muted/10 p-6',
				className
			)}
		>
			<div className="flex items-center gap-2">
				<Mail className="h-5 w-5 text-primary" />
				<h3 className="text-sm font-semibold">Stay updated</h3>
			</div>
			<p className="text-sm text-muted-foreground">
				Get the latest property management tips delivered to your inbox.
			</p>
			<form
				onSubmit={handleSubmit}
				className="flex gap-2"
				aria-label="Newsletter signup"
			>
				<input
					ref={inputRef}
					type="email"
					placeholder="your@email.com"
					required
					className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				/>
				<button
					type="submit"
					disabled={mutation.isPending}
					className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
				>
					{mutation.isPending ? 'Subscribing...' : 'Subscribe'}
				</button>
			</form>
		</div>
	)
}
