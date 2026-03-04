'use client'

import Image from 'next/image'
import { Building2, CheckCircle2, Home, Lock } from 'lucide-react'

export function InviteHeroSection() {
	return (
		<div className="relative hidden lg:flex lg:w-1/2 min-h-screen overflow-hidden">
			<div className="absolute inset-0 transform scale-105">
				<Image
					src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=2340&q=80"
					alt="Modern apartment interior"
					fill
					sizes="50vw"
					className="object-cover"
					priority
				/>
			</div>
			<div className="absolute inset-0 bg-black/25" />

			<div className="absolute inset-0 flex-center">
				<div className="relative max-w-lg mx-auto px-8">
					<div className="absolute inset-0 rounded-3xl bg-card/85 backdrop-blur-sm border border-border/20 shadow-2xl" />

					<div className="relative text-center space-y-6 py-12 px-8">
						<div className="size-16 mx-auto mb-8">
							<div className="relative w-full h-full bg-primary rounded-2xl flex-center border border-white/20 shadow-lg">
								<Building2 className="size-8 text-primary-foreground" />
							</div>
						</div>

						<h2 className="text-foreground font-bold text-xl">
							Welcome to TenantFlow
						</h2>

						<p className="text-muted-foreground max-w-md mx-auto text-base">
							Your property manager has invited you to join their platform.
							Create your account to access your tenant portal.
						</p>

						<div className="grid grid-cols-3 gap-6 pt-6">
							{[
								{ icon: CheckCircle2, label: 'Pay Rent\nOnline' },
								{ icon: Home, label: 'Submit\nRequests' },
								{ icon: Lock, label: 'Secure\nPortal' }
							].map(item => (
								<div key={item.label} className="text-center">
									<div className="size-10 mx-auto mb-2 bg-primary/10 rounded-lg flex-center">
										<item.icon className="size-5 text-primary" />
									</div>
									<div
										className="text-muted-foreground text-xs font-medium"
										dangerouslySetInnerHTML={{
											__html: item.label.replace('\n', '<br />')
										}}
									/>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
