import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface PageProps {
	params: Promise<{ token: string }>
}

/**
 * Tenant Invitation Acceptance Page
 * Validates invitation token and redirects to signup flow
 */
export default async function TenantInvitationPage({ params }: PageProps) {
	const { token } = await params

	// Validate token format (basic check before API call)
	if (!token || token.length < 32) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-muted px-4">
				<Card className="max-w-md w-full">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
							<XCircle className="size-6 text-destructive" />
						</div>
						<CardTitle>Invalid Invitation</CardTitle>
						<CardDescription>
							This invitation link appears to be invalid or incomplete.
						</CardDescription>
					</CardHeader>
					<CardContent className="text-center">
						<p className="text-sm text-muted-foreground mb-4">
							Please check the link in your email and try again, or contact your
							property manager for a new invitation.
						</p>
						<Button asChild className="w-full">
							<Link href="/login">Go to Login</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Fetch invitation details from backend
	let invitationData: {
		valid: boolean
		expired: boolean
		already_accepted: boolean
		tenant_email?: string
		tenant_first_name?: string
		property_name?: string
		expires_at?: string
	}

	try {
		const response = await fetch(
			`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/tenants/invitation/${token}`,
			{
				method: 'GET',
				cache: 'no-store' // Always fetch fresh data
			}
		)

		if (!response.ok) {
			throw new Error('Failed to validate invitation')
		}

		invitationData = await response.json()
	} catch {
		return (
			<div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-muted px-4">
				<Card className="max-w-md w-full">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
							<XCircle className="size-6 text-destructive" />
						</div>
						<CardTitle>Invitation Not Found</CardTitle>
						<CardDescription>
							We couldn't find an invitation matching this link.
						</CardDescription>
					</CardHeader>
					<CardContent className="text-center">
						<p className="text-sm text-muted-foreground mb-4">
							This invitation may have been revoked or deleted. Please contact
							your property manager for assistance.
						</p>
						<Button asChild className="w-full">
							<Link href="/login">Go to Login</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Handle expired invitation
	if (invitationData.expired) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-muted px-4">
				<Card className="max-w-md w-full">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-orange-500/10">
							<Clock className="size-6 text-orange-500" />
						</div>
						<CardTitle>Invitation Expired</CardTitle>
						<CardDescription>This invitation link has expired.</CardDescription>
					</CardHeader>
					<CardContent className="text-center">
						<p className="text-sm text-muted-foreground mb-4">
							Invitation links expire after 7 days for security reasons. Please
							contact your property manager to request a new invitation.
						</p>
						{invitationData.expires_at && (
							<p className="text-xs text-muted-foreground mb-4">
								Expired on:{' '}
								{new Date(invitationData.expires_at).toLocaleDateString()}
							</p>
						)}
						<Button asChild className="w-full">
							<Link href="/login">Go to Login</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Handle already accepted invitation
	if (invitationData.already_accepted) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-muted px-4">
				<Card className="max-w-md w-full">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-500/10">
							<CheckCircle2 className="size-6 text-green-500" />
						</div>
						<CardTitle>Invitation Already Accepted</CardTitle>
						<CardDescription>
							You've already accepted this invitation and created your account.
						</CardDescription>
					</CardHeader>
					<CardContent className="text-center">
						<p className="text-sm text-muted-foreground mb-4">
							You can now log in to access your tenant portal.
						</p>
						<Button asChild className="w-full">
							<Link href="/login">Log In to Your Portal</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Valid invitation - redirect to signup with token
	if (invitationData.valid) {
		redirect(
			`/signup?invitation=${token}&email=${encodeURIComponent(invitationData.tenant_email || '')}`
		)
	}

	// Fallback error state
	return (
		<div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-muted px-4">
			<Card className="max-w-md w-full">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
						<XCircle className="size-6 text-destructive" />
					</div>
					<CardTitle>Something Went Wrong</CardTitle>
					<CardDescription>
						We encountered an error processing your invitation.
					</CardDescription>
				</CardHeader>
				<CardContent className="text-center">
					<p className="text-sm text-muted-foreground mb-4">
						Please try again or contact your property manager for assistance.
					</p>
					<Button asChild className="w-full">
						<Link href="/login">Go to Login</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
