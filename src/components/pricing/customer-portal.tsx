"use client";

import { Settings, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { Button } from "#components/ui/button";
import { useUser } from "#hooks/api/use-auth";
import { useBillingPortalMutation } from "#hooks/api/use-billing-mutations";
import { cn } from "#lib/utils";

export function CustomerPortalButton({
	variant = "outline",
	size = "default",
	className,
	children,
	...props
}: ComponentProps<typeof Button>) {
	const router = useRouter();
	const { data: user, isLoading: isLoadingUser } = useUser();

	const portalMutation = useBillingPortalMutation();

	const handlePortalClick = () => {
		if (!user?.stripe_customer_id) {
			router.push("/pricing");
			return;
		}
		portalMutation.mutate();
	};

	if (!isLoadingUser && !user?.stripe_customer_id) {
		return (
			<Button
				variant={variant}
				size={size}
				className={cn("hover:scale-105 font-semibold", className)}
				onClick={() => router.push("/pricing")}
				{...props}
			>
				<Sparkles className="size-4 mr-2" />
				Subscribe Now
			</Button>
		);
	}

	return (
		<Button
			variant={variant}
			size={size}
			className={cn("hover:scale-105 font-semibold", className)}
			onClick={() => handlePortalClick()}
			disabled={portalMutation.isPending}
			{...props}
		>
			{children || (
				<>
					<Settings className="size-4 mr-2" />
					{portalMutation.isPending ? "Loading..." : "Manage Subscription"}
				</>
			)}
		</Button>
	);
}
