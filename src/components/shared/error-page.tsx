"use client";

import { AlertCircle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "#components/ui/button";

interface ErrorPageProps {
	error: Error & { digest?: string };
	resetAction: () => void;
	dashboardHref?: string;
}

// Sentry reporting is owned by the route-level `error.tsx` boundaries that
// render this component — see e.g. `src/app/error.tsx`. Duplicating the
// captureException call here would fire two events per uncaught error.
export function ErrorPage({
	error: _error,
	resetAction,
	dashboardHref = "/dashboard",
}: ErrorPageProps) {
	return (
		<div className="flex min-h-[400px] w-full items-center justify-center p-8">
			<div className="flex max-w-md flex-col items-center gap-4 text-center">
				<AlertCircle className="size-12 text-destructive" />
				<div className="space-y-2">
					<h2 className="typography-h4">Something went wrong</h2>
					<p className="text-muted-foreground">
						An unexpected error occurred. Please try again.
					</p>
				</div>
				<div className="flex gap-3">
					<Button onClick={resetAction} variant="outline" size="sm">
						<RefreshCw className="size-4 mr-2" />
						Try Again
					</Button>
					<Button asChild variant="outline" size="sm">
						<Link href={dashboardHref}>
							<Home className="size-4 mr-2" />
							Go to Dashboard
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
