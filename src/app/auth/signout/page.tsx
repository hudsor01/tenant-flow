"use client";

import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Alert, AlertDescription } from "#components/ui/alert";
import { Button } from "#components/ui/button";
import { CardLayout } from "#components/ui/card-layout";
import { authKeys } from "#hooks/api/use-auth";
import {
	SignOutIncompleteError,
	useSignOutMutation,
} from "#hooks/api/use-auth-mutations";
import { createClient } from "#lib/supabase/client";

/**
 * Centers the card at the width of the other `/auth/*` pages (update-password
 * and confirm-email, `max-w-md`); without it the card filled the viewport
 * (1568px wide at 1600, Part 8k). One frame for every state, the loading
 * skeleton included.
 */
function SignOutFrame({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<div className="w-full max-w-md">{children}</div>
		</div>
	);
}

/**
 * AUTH-11: Signout confirmation page
 *
 * Does NOT auto-trigger signout on mount (CSRF protection).
 * If user is signed in: shows a "Sign out" confirmation button. A success
 * lands on /login at once (useSignOutMutation); there is no timed redirect.
 * If user is already signed out: says so and offers "Sign In".
 */
export default function SignOutPage() {
	const router = useRouter();
	// The failure is shown in the page, beside its retry, not as a toast.
	const signOut = useSignOutMutation({ toastOnError: false });

	// Check if user has an active session
	const { data: session, isLoading } = useQuery({
		queryKey: authKeys.signoutCheck,
		queryFn: async () => {
			const supabase = createClient();
			const { data } = await supabase.auth.getSession();
			return data.session;
		},
		staleTime: 0,
	});

	// AUTH-10: the page says "Signed Out" on arrival with no session, and for
	// the moment between this page's successful sign-out and the landing on
	// /login. After a failed attempt it never does, even once the session is
	// gone: the mutation's second request (`scope: "local"`) removes this
	// browser's session before it returns its error (auth-js 2.118.0), and
	// AuthProvider's SIGNED_OUT handler then drops this page's session check,
	// which refetches as null. A failed first request (`scope: "others"`)
	// keeps the session: the page shows the error and "Try Again" sends it
	// again. A failed second request is SignOutIncompleteError: the page says
	// what ended and how to end the rest.
	const incomplete =
		signOut.error instanceof SignOutIncompleteError ? signOut.error : null;
	const showSignedOut = signOut.isSuccess || (!session && signOut.isIdle);

	if (isLoading && signOut.isIdle) {
		return (
			<SignOutFrame>
				<CardLayout
					title="Sign Out"
					description="Checking session..."
					isLoading={true}
				>
					<div className="py-4" />
				</CardLayout>
			</SignOutFrame>
		);
	}

	if (incomplete) {
		return (
			<SignOutFrame>
				<CardLayout title={incomplete.title} description={incomplete.detail}>
					<Button className="w-full" onClick={() => router.push("/login")}>
						Sign In
					</Button>
				</CardLayout>
			</SignOutFrame>
		);
	}

	if (showSignedOut) {
		return (
			<SignOutFrame>
				<CardLayout
					title="Signed Out"
					description="You are not signed in on this browser."
				>
					<Button className="w-full" onClick={() => router.push("/login")}>
						Sign In
					</Button>
				</CardLayout>
			</SignOutFrame>
		);
	}

	return (
		<SignOutFrame>
			{/* Sign Out ends every session of the account, on every device: the
			    other sessions first, then this one (useSignOutMutation). */}
			<CardLayout
				title="Sign out of TenantFlow?"
				description="This signs you out here and on every other device where you are signed in."
			>
				<div className="space-y-4">
					{signOut.isError && (
						<Alert variant="destructive">
							<AlertDescription className="text-destructive-text">
								Sign out failed — check your connection and try again.
							</AlertDescription>
						</Alert>
					)}
					<Button
						className="w-full"
						onClick={() => signOut.mutate()}
						disabled={signOut.isPending}
					>
						<LogOut className="mr-2 size-4" />
						{signOut.isPending
							? "Signing out..."
							: signOut.isError
								? "Try Again"
								: "Sign Out"}
					</Button>
					<Button
						variant="outline"
						className="w-full"
						onClick={() => router.back()}
					>
						Cancel
					</Button>
				</div>
			</CardLayout>
		</SignOutFrame>
	);
}
