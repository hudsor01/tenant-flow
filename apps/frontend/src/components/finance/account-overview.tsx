'use client'

import {
	ANIMATION_DURATIONS,
	buttonClasses,
	cardClasses,
	cn,
	formatCurrency,
	TYPOGRAPHY_SCALE
} from '@/lib/utils'
import {
	Bot,
	Check,
	Copy,
	CreditCard,
	Eye,
	EyeOff,
	Figma,
	Globe,
	Plus,
	Smartphone
} from 'lucide-react'
import { useState } from 'react'




function ChipSVG() {
	return (
		<svg
			enableBackground="new 0 0 132 92"
			viewBox="0 0 132 92"
			xmlns="http://www.w3.org/2000/svg"
			className="w-14"
		>
			<title>Chip</title>
			<rect
				x="0.5"
				y="0.5"
				width="131"
				height="91"
				rx="15"
				className="fill-accent stroke-accent"
			/>
			<rect
				x="9.5"
				y="9.5"
				width="48"
				height="21"
				rx="10.5"
				className="fill-accent stroke-accent-foreground"
			/>
			<rect
				x="9.5"
				y="61.5"
				width="48"
				height="21"
				rx="10.5"
				className="fill-accent stroke-accent-foreground"
			/>
			<rect
				x="9.5"
				y="35.5"
				width="48"
				height="21"
				rx="10.5"
				className="fill-accent stroke-accent-foreground"
			/>
			<rect
				x="74.5"
				y="9.5"
				width="48"
				height="21"
				rx="10.5"
				className="fill-accent stroke-accent-foreground"
			/>
			<rect
				x="74.5"
				y="61.5"
				width="48"
				height="21"
				rx="10.5"
				className="fill-accent stroke-accent-foreground"
			/>
			<rect
				x="74.5"
				y="35.5"
				width="48"
				height="21"
				rx="10.5"
				className="fill-accent stroke-accent-foreground"
			/>
		</svg>
	)
}

const recentPayments = [
	{
		id: 1,
		icon: CreditCard,
		title: 'Advance Payment',
		subtitle: 'Received via PayPal for Website Project',
		type: 'credit',
		amount: 1200,
		date: 'Jul 8'
	},
	{
		id: 2,
		icon: Bot,
		title: 'ChatGPT Subscription',
		subtitle: 'OpenAI monthly subscription',
		type: 'debit',
		amount: 20,
		date: 'Jul 7'
	},
	{
		id: 3,
		icon: Globe,
		title: 'Vercel Team Subscription',
		subtitle: 'Vercel cloud hosting charges',
		type: 'debit',
		amount: 160,
		date: 'Jul 4'
	},
	{
		id: 4,
		icon: Figma,
		title: 'Figma Pro',
		subtitle: 'Figma professional plan',
		type: 'debit',
		amount: 35,
		date: 'Jul 2'
	}
]

export function AccountOverview() {
	const [showCardDetails, setShowCardDetails] = useState(false)
	const [copied, setCopied] = useState(false)

	const handleCopyCardNumber = () => {
		navigator.clipboard.writeText('1234 5678 9012 5416')
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<Card
			className={cn(
				cardClasses(),
				'shadow-lg border-2 hover:shadow-2xl transition-all'
			)}
			style={{
				animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
				transition: `all ${ANIMATION_DURATIONS.default} ease-out`
			}}
		>
			<CardHeader
				className="items-center space-y-4"
				style={{
					animation: `slideInFromTop ${ANIMATION_DURATIONS.default} ease-out`
				}}
			>
				<div className="space-y-3 text-center">
					<CardTitle
						className="tracking-tight font-bold"
						style={{
							fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
							lineHeight: TYPOGRAPHY_SCALE['heading-xl'].lineHeight,
							fontWeight: TYPOGRAPHY_SCALE['heading-xl'].fontWeight
						}}
					>
						My Cards
					</CardTitle>
					<CardDescription className="leading-relaxed text-base max-w-md">
						Your card summary, balance, and recent transactions in one secure
						view.
					</CardDescription>
				</div>
				<CardAction>
					<Button
						size="icon"
						variant="outline"
						className={cn(
							buttonClasses('outline', 'sm'),
							'hover:scale-110 transition-all'
						)}
					>
						<Plus className="size-4" />
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent
				className="p-6"
				style={{
					animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out`
				}}
			>
				<Tabs className="gap-6 space-y-6" defaultValue="virtual">
					<TabsList className="w-full h-12">
						<TabsTrigger
							value="virtual"
							className="flex-1 h-10 text-sm font-medium transition-all"
						>
							Virtual Card
						</TabsTrigger>
						<TabsTrigger
							value="physical"
							disabled
							className="flex-1 h-10 text-sm font-medium transition-all opacity-50"
						>
							Physical Card
						</TabsTrigger>
					</TabsList>
					<TabsContent
						value="virtual"
						style={{
							animation: `slideInFromLeft ${ANIMATION_DURATIONS.default} ease-out`
						}}
					>
						<div className="space-y-6">
							<div
								className="bg-gradient-to-br from-primary via-primary to-primary/80 relative aspect-8/5 w-full max-w-96 mx-auto overflow-hidden rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 cursor-pointer group"
								style={{
									transition: `all ${ANIMATION_DURATIONS.slow} ease-out`,
									background:
										'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 50%, hsl(var(--primary)/0.9) 100%)'
								}}
							>
								<div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
								<div className="absolute top-6 left-6">
									<Smartphone className="text-primary-foreground size-8 group-hover:scale-110 transition-transform" />
								</div>
								<div className="absolute top-6 right-6">
									<div className="text-primary-foreground/80 text-xs font-medium tracking-wider">
										VIRTUAL
									</div>
								</div>
								<div className="absolute top-1/2 w-full -translate-y-1/2">
									<div className="flex items-end justify-between px-6">
										<span className="text-primary-foreground font-mono text-xl leading-none font-bold tracking-wider">
											JOHN DOE
										</span>
										<div className="group-hover:scale-110 transition-transform">
											<ChipSVG />
										</div>
									</div>
								</div>
								<div className="absolute bottom-6 left-6 right-6">
									<div className="flex items-center justify-between">
										<span className="text-primary-foreground/90 font-mono text-sm tracking-widest">
											•••• •••• •••• 5416
										</span>
										<span className="text-primary-foreground/90 font-mono text-sm">
											06/29
										</span>
									</div>
								</div>
							</div>

							<div
								className="space-y-4 p-4 bg-muted/30 rounded-xl border"
								style={{
									animation: `slideInFromRight ${ANIMATION_DURATIONS.default} ease-out`
								}}
							>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground font-medium">
										Card Number
									</span>
									<div className="flex items-center gap-2">
										<span className="font-semibold tabular-nums">
											{showCardDetails
												? '1234 5678 9012 5416'
												: '•••• •••• •••• 5416'}
										</span>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setShowCardDetails(!showCardDetails)}
											className="p-1 h-6 w-6 hover:bg-muted"
										>
											{showCardDetails ? (
												<EyeOff className="size-3" />
											) : (
												<Eye className="size-3" />
											)}
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={handleCopyCardNumber}
											className="p-1 h-6 w-6 hover:bg-muted"
										>
											{copied ? (
												<Check className="size-3 text-primary" />
											) : (
												<Copy className="size-3" />
											)}
										</Button>
									</div>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground font-medium">
										Expiry Date
									</span>
									<span className="font-semibold tabular-nums">06/29</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground font-medium">CVC</span>
									<span className="font-semibold">
										{showCardDetails ? '123' : '•••'}
									</span>
								</div>
								<Separator />
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground font-medium">
										Spending Limit
									</span>
									<span className="font-bold tabular-nums text-lg">
										$62,000.00
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground font-medium">
										Available Balance
									</span>
									<span className="font-bold tabular-nums text-xl text-primary">
										$13,100.06
									</span>
								</div>
							</div>

							<div
								className="flex gap-3"
								style={{
									animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out`
								}}
							>
								<Button
									className={cn(
										buttonClasses('outline', 'sm'),
										'flex-1 h-10 hover:bg-primary/5 hover:border-primary/20 hover:text-primary',
										'transition-all'
									)}
								>
									Freeze Card
								</Button>
								<Button
									className={cn(
										buttonClasses('outline', 'sm'),
										'flex-1 h-10 hover:bg-primary/5 hover:border-primary/20 hover:text-primary',
										'transition-all'
									)}
								>
									Set Limit
								</Button>
								<Button
									className={cn(
										buttonClasses('outline', 'sm'),
										'flex-1 h-10 hover:bg-primary/5 hover:border-primary/20 hover:text-primary',
										'transition-all'
									)}
								>
									More
								</Button>
							</div>

							<Separator />

							<div
								className="space-y-6"
								style={{
									animation: `slideInFromBottom ${ANIMATION_DURATIONS.slow} ease-out`
								}}
							>
								<div className="flex items-center justify-between">
									<h6 className="text-foreground text-base font-semibold">
										Recent Payments
									</h6>
									<p className="text-muted-foreground text-sm">Last 7 days</p>
								</div>

								<div className="space-y-3">
									{recentPayments.map((transaction, index) => (
										<div
											key={transaction.id}
											className="flex items-center gap-4 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 group cursor-pointer border border-transparent hover:border-muted transition-all"
											style={{
												animation: `slideInFromLeft ${ANIMATION_DURATIONS.default} ease-out`,
												animationDelay: `${index * 100}ms`
											}}
										>
											<div className="bg-muted/60 flex size-12 shrink-0 items-center justify-center rounded-full group-hover:bg-primary/10 group-hover:scale-110 transition-all">
												<transaction.icon className="size-5 group-hover:text-primary transition-colors" />
											</div>
											<div className="flex w-full items-center justify-between">
												<div className="space-y-1">
													<p className="text-sm font-semibold text-foreground">
														{transaction.title}
													</p>
													<p className="text-muted-foreground line-clamp-1 text-xs leading-relaxed">
														{transaction.subtitle}
													</p>
													<p className="text-muted-foreground text-xs">
														{transaction.date}
													</p>
												</div>
												<div className="text-right">
													<span
														className={cn(
															'text-base leading-none font-bold tabular-nums',
															transaction.type === 'debit'
																? 'text-accent'
																: 'text-primary',
															'transition-all'
														)}
													>
														{transaction.type === 'debit' ? '-' : '+'}
														{formatCurrency(transaction.amount)}
													</span>
												</div>
											</div>
										</div>
									))}
								</div>

								<Button
									className={cn(
										buttonClasses('outline', 'sm'),
										'w-full h-10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary font-semibold',
										'transition-all'
									)}
								>
									View All Payments
								</Button>
							</div>
						</div>
					</TabsContent>
					<TabsContent
						value="physical"
						style={{
							animation: `slideInFromRight ${ANIMATION_DURATIONS.default} ease-out`
						}}
					>
						<div
							className="flex flex-col items-center justify-center py-12 space-y-6 text-center"
							style={{
								animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`
							}}
						>
							<div className="bg-muted/30 rounded-full p-6">
								<CreditCard className="size-12 text-muted-foreground" />
							</div>
							<div className="space-y-3 max-w-md">
								<h3
									className="font-bold text-foreground"
									style={{
										fontSize: TYPOGRAPHY_SCALE['heading-md'].fontSize,
										lineHeight: TYPOGRAPHY_SCALE['heading-md'].lineHeight
									}}
								>
									Physical Card Coming Soon
								</h3>
								<p className="text-muted-foreground leading-relaxed">
									Order your premium physical card to use anywhere. Get notified
									when it becomes available.
								</p>
							</div>
							<Button
								className={cn(
									buttonClasses('primary', 'sm'),
									'hover:scale-105',
									'transition-all'
								)}
							>
								Get Notified
							</Button>
						</div>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	)
}
