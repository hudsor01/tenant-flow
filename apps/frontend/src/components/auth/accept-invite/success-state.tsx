'use client'

import { CheckCircle2 } from 'lucide-react'

export function SuccessState() {
	return (
		<div className="min-h-screen flex-center bg-background p-6">
			<div className="w-full max-w-md text-center space-y-6">
				<div className="size-20 mx-auto rounded-full bg-success/10 flex-center">
					<CheckCircle2 className="size-10 text-success" />
				</div>

				<div className="space-y-2">
					<h1 className="typography-h3 text-foreground">
						Welcome to TenantFlow!
					</h1>
					<p className="text-muted-foreground">
						Your account has been created and verified. Redirecting you to your
						tenant portal...
					</p>
				</div>

				<div className="pt-4">
					<div className="animate-spin size-6 mx-auto border-2 border-primary border-t-transparent rounded-full" />
				</div>
			</div>
		</div>
	)
}
