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
import { Input } from '#components/ui/input'
import { createClient } from '#lib/supabase/client'
import { handleMutationError } from '#lib/mutation-error-handler'

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
 * so the surface can be toggled per environment without a code change.
 * (The env var is bundled at build time, so toggling still requires a
 * redeploy — but only an env-var update, not a code edit + review.)
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
		onError: err =>
			handleMutationError(err, 'Lead capture subscribe', 'Could not subscribe. Please try again.'),
	})

	function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault()
		// Guard against touch double-tap: the submit button's `disabled`
		// flag from React's render cycle isn't reliable for a second
		// synchronous event fired before re-render.
		if (mutation.isPending) return
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
						<Input
							ref={inputRef}
							type="email"
							placeholder="your@email.com"
							required
							autoFocus
							aria-label="Email address"
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
