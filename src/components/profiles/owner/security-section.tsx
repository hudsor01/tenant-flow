"use client";

import { Key, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { BlurFade } from "#components/ui/blur-fade";
import { Button } from "#components/ui/button";

interface SecuritySectionProps {
	onChangePassword: () => void;
}

export function SecuritySection({ onChangePassword }: SecuritySectionProps) {
	const router = useRouter();

	return (
		<BlurFade delay={0.6}>
			<section className="rounded-lg border bg-card p-6">
				<h3 className="mb-4 text-lg font-semibold">Security Status</h3>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<BlurFade delay={0.65}>
						<div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
							<div className="flex items-center gap-3">
								<Key className="h-5 w-5 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Password</p>
									<p className="mb-0 text-xs text-muted-foreground">
										Secure your account
									</p>
								</div>
							</div>
							<Button variant="ghost" size="sm" onClick={onChangePassword}>
								Change
							</Button>
						</div>
					</BlurFade>

					<BlurFade delay={0.7}>
						<div className="flex items-center justify-between rounded-lg bg-muted/50 p-4 relative overflow-hidden">
							<div className="flex items-center gap-3">
								<Shield className="h-5 w-5 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Two-Factor Auth</p>
									<p className="mb-0 text-xs text-muted-foreground">
										Extra security layer
									</p>
								</div>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => router.push("/settings?tab=security")}
							>
								Setup
							</Button>
						</div>
					</BlurFade>
				</div>
			</section>
		</BlurFade>
	);
}
