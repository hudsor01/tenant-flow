"use client";

import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
 * AUTH-11: Signout confirmation page
 *
 * Does NOT auto-trigger signout on mount (CSRF protection).
 * If user is signed in: shows a "Sign out" confirmation button.
 * If user is already signed out: shows "You have been signed out" message.
 */
export default function SignOutPage() {
	const router = useRouter();
	// The failure is shown in the page, beside its retry, not as a toast.
	const signOut = useSignOutMutation({ toastOnError: false });
	const [signedOut, setSignedOut] = useState(false);

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

	// AUTH-10: the page says "Signed Out" only after this page's sign-out
	// succeeded, or on arrival with no session. After a failed attempt it never
	// does, even once the session is gone: the mutation's second request
	// (`scope: "local"`) removes this browser's session before it returns its
	// error (auth-js 2.118.0), and AuthProvider's SIGNED_OUT handler then drops
	// this page's session check, which refetches as null. A failed first
	// request (`scope: "others"`) keeps the session: the page shows the error
	// and "Try Again" sends it again. A failed second request is
	// SignOutIncompleteError: the page says what ended and how to end the rest.
	const incomplete =
		signOut.error instanceof SignOutIncompleteError ? signOut.error : null;
	const showSignedOut = signedOut || (!session && signOut.isIdle);

	function handleSignOut() {
		signOut.mutate(undefined, {
			onSuccess: () => {
				setSignedOut(true);
			},
		});
	}

	// Redirect to login after showing signed-out confirmation
	useEffect(() => {
		if (!signedOut) return;
		const timer = setTimeout(() => {
			router.push("/login");
		}, 3000);
		return () => clearTimeout(timer);
	}, [signedOut, router]);

	if (isLoading && signOut.isIdle) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<CardLayout
					title="Sign Out"
					description="Checking session..."
					isLoading={true}
				>
					<div className="py-4" />
				</CardLayout>
			</div>
		);
	}

	if (incomplete) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<CardLayout title={incomplete.title} description={incomplete.detail}>
					<Button className="w-full" onClick={() => router.push("/login")}>
						Sign In
					</Button>
				</CardLayout>
			</div>
		);
	}

	if (showSignedOut) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<CardLayout
					title="Signed Out"
					description="You have been signed out successfully."
				>
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground text-center">
							You will be redirected to the login page shortly.
						</p>
						<Button className="w-full" onClick={() => router.push("/login")}>
							Back to Login
						</Button>
					</div>
				</CardLayout>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
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
						onClick={handleSignOut}
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
		</div>
	);
}
