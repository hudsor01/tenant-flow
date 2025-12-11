'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { LeaseCreationWizard } from '#components/leases/wizard'

export default function NewLeasePage() {
	const [token, setToken] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const router = useRouter()

	useEffect(() => {
		const getSession = async () => {
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
			const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
			const supabase = createBrowserClient(supabaseUrl, supabaseKey)

			const {
				data: { session },
				error
			} = await supabase.auth.getSession()

			if (error || !session?.access_token) {
				router.push('/login')
				return
			}

			setToken(session.access_token)
			setIsLoading(false)
		}

		getSession()
	}, [router])

	if (isLoading || !token) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		)
	}

	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="typography-h3 tracking-tight">Create Lease</h1>
				<p className="text-muted-foreground">
					Set up a new lease agreement by selecting a property, unit, and
					tenant, then configure the lease terms.
				</p>
			</div>
			<LeaseCreationWizard
				token={token}
				onSuccess={leaseId => router.push(`/leases/${leaseId}`)}
			/>
		</div>
	)
}
