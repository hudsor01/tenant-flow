"use client";

import { AlertCircle, CheckCircle2, PenLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#components/ui/alert-dialog";
import { Button } from "#components/ui/button";
import { Checkbox } from "#components/ui/checkbox";
import { Label } from "#components/ui/label";
import { useSignLeaseAsOwnerMutation } from "#hooks/api/use-lease-signature-mutations";
import { cn } from "#lib/utils";

interface SignLeaseButtonProps {
	leaseId: string;
	disabled?: boolean;
	alreadySigned?: boolean;
	className?: string;
	variant?: "default" | "outline" | "secondary" | "ghost";
	size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Button for the OWNER to sign a lease in-app (direct signature with IP +
 * user-agent capture). Shows a confirmation dialog with legal acknowledgment.
 * Tenants sign via the emailed single-use /sign/[token] link — they are
 * records, not auth users — so there is no in-app tenant signing path.
 */
export function SignLeaseButton({
	leaseId,
	disabled = false,
	alreadySigned = false,
	className,
	variant = "default",
	size = "default",
}: SignLeaseButtonProps) {
	const [agreed, setAgreed] = useState(false);
	const [open, setOpen] = useState(false);
	const mutation = useSignLeaseAsOwnerMutation();

	const handleSign = async () => {
		if (!agreed) {
			toast.error("Please agree to the terms before signing");
			return;
		}

		try {
			await mutation.mutateAsync(leaseId);
			toast.success("Lease signed successfully", {
				description: "Your signature has been recorded.",
				icon: <CheckCircle2 className="h-4 w-4 text-success" />,
			});
			setOpen(false);
			setAgreed(false);
		} catch (error) {
			toast.error("Failed to sign lease", {
				description:
					error instanceof Error ? error.message : "Please try again.",
				icon: <AlertCircle className="h-4 w-4 text-destructive" />,
			});
		}
	};

	if (alreadySigned) {
		return (
			<Button
				variant="outline"
				size={size}
				disabled
				className={cn("gap-2 text-success-text border-success/20", className)}
			>
				<CheckCircle2 className="h-4 w-4" />
				Signed
			</Button>
		);
	}

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<Button
					variant={variant}
					size={size}
					disabled={disabled}
					className={cn("gap-2", className)}
					data-testid="sign-lease-owner-button"
				>
					<PenLine className="h-4 w-4" />
					Sign Lease
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Sign Lease Agreement</AlertDialogTitle>
					<AlertDialogDescription className="space-y-3">
						<p>
							You are about to electronically sign this lease agreement as the{" "}
							<strong>owner</strong>.
						</p>
						<p>
							By signing, you acknowledge that you have read and agree to all
							terms and conditions outlined in the lease agreement.
						</p>
						<p className="text-warning-text font-medium">
							This action is legally binding and cannot be undone.
						</p>
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="flex items-start gap-3 py-4 px-4 bg-muted/50 rounded-lg">
					<Checkbox
						id="agree-terms"
						checked={agreed}
						onCheckedChange={(checked) => setAgreed(checked === true)}
					/>
					<Label
						htmlFor="agree-terms"
						className="text-sm leading-relaxed cursor-pointer"
					>
						I confirm that I have read and understood the lease agreement, and I
						agree to be legally bound by its terms.
					</Label>
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={mutation.isPending}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={(e) => {
							e.preventDefault();
							handleSign();
						}}
						disabled={!agreed || mutation.isPending}
						className="gap-2"
					>
						{mutation.isPending ? (
							"Signing..."
						) : (
							<>
								<PenLine className="h-4 w-4" />
								Sign as Owner
							</>
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
