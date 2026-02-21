import { Download, Calendar } from 'lucide-react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Button } from '#components/ui/button'
import { BlurFade } from '#components/ui/blur-fade'

interface FinancialsHeaderProps {
	year: string
	onYearChange: (value: string) => void
}

export function FinancialsHeader({ year, onYearChange }: FinancialsHeaderProps) {
	return (
		<BlurFade delay={0.1} inView>
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="typography-h1">Financial Overview</h1>
					<p className="text-muted-foreground">
						Revenue, expenses, and financial health at a glance.
					</p>
				</div>
				<div className="flex gap-2">
					<Select value={year} onValueChange={onYearChange}>
						<SelectTrigger className="w-[100px]">
							<Calendar className="w-4 h-4 mr-2" />
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="2024">2024</SelectItem>
							<SelectItem value="2023">2023</SelectItem>
							<SelectItem value="2022">2022</SelectItem>
						</SelectContent>
					</Select>
					<Button variant="outline">
						<Download className="w-4 h-4 mr-2" />
						Export
					</Button>
				</div>
			</div>
		</BlurFade>
	)
}
