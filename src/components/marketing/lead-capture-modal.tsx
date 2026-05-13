'use client'

import { Mail } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '#components/ui/dialog'
import { Button } from '#components/ui/button'
import { createClient } from '#lib/supabase/client'

interface LeadCaptureModalProps {
	scrollPercentTrigger?: number
	enableExitIntent?: boolean
}

// Shown once per session — never re-show on the same browser tab, never
// re-show after a successful subscribe.
const SESSION_KEY = 'tenantflow-lead-modal-shown'

/**
 * Lead-capture modal that triggers on exit-intent (desktop only) OR
 * scroll-depth (default 70%). Gated by `NEXT_PUBLIC_LEAD_CAPTURE_MODAL=on`
 * so we can A/B test the surface without a code deploy.
 *
 * Submits to the existing `newsletter-subscribe` Edge Function — no
 * additional backend wiring needed.
 */
export function LeadCaptureModal({
	scrollPercentTrigger = 70,
	enableExitIntent = true,
}: LeadCaptureModalProps) {
	const [open, setOpen] = useState(false)
	const [enabled, setEnabled] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)
	const shownThisSession = useRef(false)

	useEffect(() => {
		if (process.env.NEXT_PUBLIC_LEAD_CAPTURE_MODAL !== 'on') return
		if (window.sessionStorage.getItem(SESSION_KEY) === 'true') return
		setEnabled(true)
	}, [])

	useEffect(() => {
		if (!enabled) return

		function trigger() {
			if (shownThisSession.current) return
			shownThisSession.current = true
			window.sessionStorage.setItem(SESSION_KEY, 'true')
			setOpen(true)
		}

		function onScroll() {
			const doc = document.documentElement
			const scrollable = doc.scrollHeight - window.innerHeight
			if (scrollable <= 0) return
			const pct = (window.scrollY / scrollable) * 100
			if (pct >= scrollPercentTrigger) trigger()
		}

		function onMouseLeave(e: MouseEvent) {
			// Exit-intent: mouse leaves the viewport from the top edge.
			// Skip on touch devices (no real `mouseleave` semantics).
			if (e.clientY <= 0 && window.matchMedia('(hover: hover)').matches) {
				trigger()
			}
		}

		window.addEventListener('scroll', onScroll, { passive: true })
		if (enableExitIntent) {
			document.addEventListener('mouseleave', onMouseLeave)
		}

		return () => {
			window.removeEventListener('scroll', onScroll)
			if (enableExitIntent) {
				document.removeEventListener('mouseleave', onMouseLeave)
			}
		}
	}, [enabled, scrollPercentTrigger, enableExitIntent])

	const mutation = useMutation({
		mutationFn: async (email: string) => {
			const supabase = createClient()
			const { error } = await supabase.functions.invoke(
				'newsletter-subscribe',
				{ body: { email } },
			)
			if (error) throw error
		},
		onSuccess: () => {
			toast.success('Subscribed! Check your inbox.')
			setOpen(false)
		},
		onError: () => {
			toast.error('Could not subscribe. Please try again.')
		},
	})

	function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const email = inputRef.current?.value?.trim()
		if (email) mutation.mutate(email)
	}

	if (!enabled) return null

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Mail className="size-5 text-primary" />
						Get the landlord operations guide
					</DialogTitle>
					<DialogDescription>
						Monthly tips on leases, maintenance, and tax season — written for
						landlords with 1–15 rentals.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<DialogBody>
						<input
							ref={inputRef}
							type="email"
							placeholder="your@email.com"
							required
							autoFocus
							aria-label="Email address"
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						/>
					</DialogBody>
					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={() => setOpen(false)}
						>
							No thanks
						</Button>
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending ? 'Subscribing…' : 'Send me the guide'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
