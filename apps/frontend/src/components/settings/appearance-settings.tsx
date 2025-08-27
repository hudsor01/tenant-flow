import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export function AppearanceSettings() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<i className="i-lucide-palette inline-block h-5 w-5"  />
						Appearance
					</CardTitle>
					<CardDescription>
						Customize the look and feel of your dashboard.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-4">
						<Label className="text-base font-medium">Theme</Label>
						<RadioGroup
							defaultValue="system"
							className="grid grid-cols-3 gap-4"
						>
							<div className="flex items-center space-x-2 rounded-lg border p-4">
								<RadioGroupItem value="light" id="light" />
								<Label
									htmlFor="light"
									className="flex cursor-pointer items-center gap-2"
								>
									<i className="i-lucide-sun inline-block h-4 w-4"  />
									Light
								</Label>
							</div>
							<div className="flex items-center space-x-2 rounded-lg border p-4">
								<RadioGroupItem value="dark" id="dark" />
								<Label
									htmlFor="dark"
									className="flex cursor-pointer items-center gap-2"
								>
									<i className="i-lucide-moon inline-block h-4 w-4"  />
									Dark
								</Label>
							</div>
							<div className="flex items-center space-x-2 rounded-lg border p-4">
								<RadioGroupItem value="system" id="system" />
								<Label
									htmlFor="system"
									className="flex cursor-pointer items-center gap-2"
								>
									<i className="i-lucide-monitor inline-block h-4 w-4"  />
									System
								</Label>
							</div>
						</RadioGroup>
					</div>

					<div className="space-y-4">
						<Label className="text-base font-medium">
							Display Options
						</Label>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<Label>Compact Mode</Label>
									<p className="text-muted-foreground text-sm">
										Reduce spacing and padding for more
										content
									</p>
								</div>
								<Switch />
							</div>

							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<Label>Show Sidebar</Label>
									<p className="text-muted-foreground text-sm">
										Keep navigation sidebar always visible
									</p>
								</div>
								<Switch defaultChecked />
							</div>

							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<Label>Reduce Motion</Label>
									<p className="text-muted-foreground text-sm">
										Minimize animations and transitions
									</p>
								</div>
								<Switch />
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
