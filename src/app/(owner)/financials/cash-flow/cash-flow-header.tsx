import { Download } from 'lucide-react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { BlurFade } from '#components/ui/blur-fade'

interface CashFlowHeaderProps {
	period: string
	year: string
	onPeriodChange: (value: string) => void
	onYearChange: (value: string) => void
}

export function CashFlowHeader({
	period,
	year,
	onPeriodChange,
	onYearChange
}: CashFlowHeaderProps) {
	return (
		<BlurFade delay={0.1} inView>
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="typography-h1">Cash Flow</h1>
					<p className="text-muted-foreground">
						Track money coming in and going out.
					</p>
				</div>
				<div className="flex gap-2">
					<Select value={period} onValueChange={onPeriodChange}>
						<SelectTrigger className="w-[130px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="monthly">Monthly</SelectItem>
							<SelectItem value="quarterly">Quarterly</SelectItem>
							<SelectItem value="yearly">Yearly</SelectItem>
						</SelectContent>
					</Select>
					<Select value={year} onValueChange={onYearChange}>
						<SelectTrigger className="w-[100px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="2024">2024</SelectItem>
							<SelectItem value="2023">2023</SelectItem>
							<SelectItem value="2022">2022</SelectItem>
						</SelectContent>
					</Select>
					<button className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-muted text-foreground font-medium rounded-lg transition-colors">
						<Download className="w-4 h-4" />
						Export
					</button>
				</div>
			</div>
		</BlurFade>
	)
}
