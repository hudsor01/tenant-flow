"use client";

import { Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "#components/ui/button";

interface ErrorFallbackProps {
	error: Error & { digest?: string };
	reset: () => void;
}

// Sentry reporting is owned by the route-level `error.tsx` / `global-error.tsx`
// boundaries that render this component. Duplicating the captureException
// call here would fire two events per uncaught error.
export function ErrorFallback({ error: _error, reset }: ErrorFallbackProps) {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
			<h2 className="text-xl font-semibold">Something went wrong!</h2>
			<p className="text-sm text-muted-foreground">
				We have been notified and are working to fix the issue.
			</p>
			<div className="flex gap-3">
				<Button onClick={() => reset()} variant="outline" size="sm">
					<RefreshCw className="size-4 mr-2" />
					Try again
				</Button>
				<Button asChild variant="outline" size="sm">
					<Link href="/">
						<Home className="size-4 mr-2" />
						Go to Dashboard
					</Link>
				</Button>
			</div>
		</div>
	);
}
