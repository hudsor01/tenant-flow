import { Home } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert";
import { Button } from "#components/ui/button";

interface NotFoundPageProps {
	/** Where the recovery button points. Default: /dashboard */
	dashboardHref?: string;
	/**
	 * Label for the recovery button. Default infers from `dashboardHref`:
	 * "Back to Dashboard" for `/dashboard`, "Back to Home" for `/`, or the
	 * caller-supplied label for anything else.
	 */
	dashboardLabel?: string;
}

function inferLabel(href: string): string {
	if (href === "/") return "Back to Home";
	if (href === "/dashboard") return "Back to Dashboard";
	return "Go back";
}

export function NotFoundPage({
	dashboardHref = "/dashboard",
	dashboardLabel,
}: NotFoundPageProps) {
	const label = dashboardLabel ?? inferLabel(dashboardHref);
	return (
		<section className="flex min-h-[400px] items-center justify-center p-8">
			<div className="max-w-md w-full space-y-4">
				<Alert variant="destructive">
					<AlertTitle>Page not found</AlertTitle>
					<AlertDescription>
						The page you are looking for does not exist or has been removed.
					</AlertDescription>
				</Alert>

				<Button asChild variant="outline" className="w-full">
					<Link href={dashboardHref}>
						<Home className="size-4 mr-2" />
						{label}
					</Link>
				</Button>
			</div>
		</section>
	);
}
