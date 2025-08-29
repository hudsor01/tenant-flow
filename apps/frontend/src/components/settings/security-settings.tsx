import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function SecuritySettings() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<i className="i-lucide-shield h-5 w-5"  />
						Security Settings
					</CardTitle>
					<CardDescription>
						Manage your account security and authentication methods.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid gap-4 md:grid-cols-2">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-lg">
									<i className="i-lucide-key h-4 w-4"  />
									Password
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-sm">
										Last changed 30 days ago
									</span>
									<Badge variant="outline">Strong</Badge>
								</div>
								<Button size="sm" className="w-full">
									Change Password
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-lg">
									<i className="i-lucide-smartphone h-4 w-4"  />
									Two-Factor Auth
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-sm">Status</span>
									<Badge variant="secondary">Disabled</Badge>
								</div>
								<Button size="sm" className="w-full">
									Enable 2FA
								</Button>
							</CardContent>
						</Card>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
