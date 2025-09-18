'use client'

import {
	ArrowRightIcon,
	HeartIcon,
	PauseIcon,
	PlayIcon,
	StarIcon
} from 'lucide-react'
import { useState } from 'react'
import { Button } from 'src/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from 'src/components/ui/card'

export default function ComponentTestPage() {
	const [_dialogOpen, _setDialogOpen] = useState(false)
	const [currentTest, setCurrentTest] = useState('')

	const runTest = (testName: string) => {
		setCurrentTest(testName)

		console.info(`Running test: ${testName}`)
	}

	return (
		<div className="min-h-screen bg-background p-8 space-y-12">
			{/* Header */}
			<div className="text-center space-y-4">
				<h1 className="text-4xl font-bold">Apple Components Battle Test</h1>
				<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
					Testing Apple motion tokens, 44px touch targets, and glass effects.
					Every interaction should feel fluid, premium, and accessible.
				</p>
			</div>

			{/* Button Testing Section */}
			<section className="space-y-8">
				<h2 className="text-2xl font-semibold">
					Button Tests - 44px Touch Targets
				</h2>

				<div className="grid gap-6">
					{/* Size Tests */}
					<div className="space-y-4">
						<h3 className="text-lg font-medium">Size & Touch Target Tests</h3>
						<div className="flex flex-wrap gap-4">
							<Button size="xs" onClick={() => runTest('Button XS')}>
								XS (32px - Below target)
							</Button>
							<Button size="sm" onClick={() => runTest('Button SM')}>
								SM (36px - Close to target)
							</Button>
							<Button size="default" onClick={() => runTest('Button Default')}>
								Default (44px - Perfect!)
							</Button>
							<Button size="lg" onClick={() => runTest('Button LG')}>
								LG (48px - Above target)
							</Button>
							<Button size="xl" onClick={() => runTest('Button XL')}>
								XL (56px - Premium)
							</Button>
							<Button size="icon" onClick={() => runTest('Icon Button')}>
								<PlayIcon />
							</Button>
						</div>
					</div>

					{/* Variant Tests */}
					<div className="space-y-4">
						<h3 className="text-lg font-medium">Variant & Motion Tests</h3>
						<div className="flex flex-wrap gap-4">
							<Button
								variant="default"
								onClick={() => runTest('Primary Motion')}
							>
								<PlayIcon className="mr-2" />
								Primary Motion
							</Button>
							<Button
								variant="secondary"
								onClick={() => runTest('Secondary Motion')}
							>
								<PauseIcon className="mr-2" />
								Secondary Motion
							</Button>
							<Button
								variant="destructive"
								onClick={() => runTest('Destructive Motion')}
							>
								<PauseIcon className="mr-2" />
								Destructive Motion
							</Button>
							<Button
								variant="outline"
								onClick={() => runTest('Outline Motion')}
							>
								<ArrowRightIcon className="mr-2" />
								Outline Motion
							</Button>
							<Button variant="ghost" onClick={() => runTest('Ghost Motion')}>
								<HeartIcon className="mr-2" />
								Ghost Motion
							</Button>
							<Button variant="link" onClick={() => runTest('Link Motion')}>
								Link Motion
							</Button>
						</div>
					</div>

					{/* Mobile Touch Test */}
					<div className="space-y-4">
						<h3 className="text-lg font-medium">
							Mobile Touch Experience (Test with finger)
						</h3>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<Button
								className="h-12"
								onClick={() => runTest('Mobile Touch 1')}
							>
								Tap Me
							</Button>
							<Button
								className="h-12"
								variant="outline"
								onClick={() => runTest('Mobile Touch 2')}
							>
								Tap Me Too
							</Button>
							<Button
								className="h-12"
								variant="secondary"
								onClick={() => runTest('Mobile Touch 3')}
							>
								Press & Hold
							</Button>
							<Button
								className="h-12"
								variant="ghost"
								onClick={() => runTest('Mobile Touch 4')}
							>
								Light Touch
							</Button>
						</div>
					</div>
				</div>
			</section>

			{/* Card Testing Section */}
			<section className="space-y-8">
				<h2 className="text-2xl font-semibold">
					Card Tests - Apple Glass Effects
				</h2>

				<div className="grid md:grid-cols-3 gap-6">
					<Card variant="default" onClick={() => runTest('Default Card')}>
						<div className="p-6">
							<h3 className="font-semibold mb-2">Default Card</h3>
							<p className="text-sm text-muted-foreground mb-4">
								Subtle shadow and clean aesthetic
							</p>
							<p>Test the basic card interaction and shadow behavior.</p>
						</div>
					</Card>

					<Card variant="elevated" onClick={() => runTest('Elevated Card')}>
						<div className="p-6">
							<h3 className="font-semibold mb-2">Elevated Card</h3>
							<p className="text-sm text-muted-foreground mb-4">
								Enhanced shadow with lift effect
							</p>
							<p>Hover to see the translation and shadow enhancement.</p>
						</div>
					</Card>

					<Card
						variant="interactive"
						onClick={() => runTest('Interactive Card')}
					>
						<div className="p-6">
							<h3 className="font-semibold mb-2">Interactive Card</h3>
							<p className="text-sm text-muted-foreground mb-4">
								Press feedback and cursor pointer
							</p>
							<p>Click to test the active scale and shadow effects.</p>
						</div>
					</Card>

					<Card variant="premium" onClick={() => runTest('Premium Card')}>
						<div className="p-6">
							<h3 className="font-semibold mb-2">Premium Glass Card</h3>
							<p className="text-sm text-muted-foreground mb-4">
								Apple-style glass effect
							</p>
							<p>Premium styling with gradient border and glass background.</p>
						</div>
					</Card>

					<Card variant="success" onClick={() => runTest('Success Card')}>
						<div className="p-6">
							<h3 className="font-semibold mb-2">Success State</h3>
							<p className="text-sm text-muted-foreground mb-4">
								Semantic success styling
							</p>
							<p>Apple-styled semantic feedback.</p>
						</div>
					</Card>

					<Card variant="warning" onClick={() => runTest('Warning Card')}>
						<div className="p-6">
							<h3 className="font-semibold mb-2">Warning State</h3>
							<p className="text-sm text-muted-foreground mb-4">
								Semantic warning styling
							</p>
							<p>Apple-styled warning feedback.</p>
						</div>
					</Card>
				</div>
			</section>

			{/* Dialog Testing Section - Temporarily Removed */}
			<section className="space-y-8">
				<h2 className="text-2xl font-semibold">
					Dialog Tests - Apple Motion & Glass
				</h2>
				<div className="p-4 border rounded-lg">
					<p className="text-muted-foreground">
						Dialog components temporarily disabled while fixing imports. Test
						buttons and cards above for Apple motion tokens and 44px touch
						targets.
					</p>
				</div>
			</section>

			{/* Motion Test Results */}
			<section className="space-y-8">
				<h2 className="text-2xl font-semibold">Test Results & Observations</h2>

				<Card>
					<CardHeader>
						<CardTitle>Current Test: {currentTest || 'None'}</CardTitle>
						<CardDescription>Watch console for test logs</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div>
								<h4 className="font-medium mb-2">Key Things to Test:</h4>
								<ul className="text-sm space-y-1 text-muted-foreground">
									<li>
										• Button hover: Smooth -1px translation with shadow
										enhancement
									</li>
									<li>• Button active: 0.96 scale with smooth return</li>
									<li>
										• Card hover: -1px or -2px translation with shadow upgrade
									</li>
									<li>
										• Dialog: Smooth backdrop blur (20px) and zoom-in animation
									</li>
									<li>
										• All animations: Fast Apple timing (200-300ms expo easing)
									</li>
									<li>
										• Touch targets: 44px minimum on default+ button sizes
									</li>
								</ul>
							</div>
							<div>
								<h4 className="font-medium mb-2">
									Apple Motion Tokens Active:
								</h4>
								<ul className="text-sm space-y-1 text-muted-foreground">
									<li>• Duration: var(--duration-fast) = 200ms</li>
									<li>
										• Easing: var(--ease-out-expo) = cubic-bezier(0.16, 1, 0.3,
										1)
									</li>
									<li>• Shadows: var(--shadow-sm/md/lg) for depth hierarchy</li>
									<li>
										• Radius: var(--radius-md) for consistent Apple corner
										radius
									</li>
								</ul>
							</div>
						</div>
					</CardContent>
					<CardFooter>
						<Button onClick={() => setCurrentTest('')} variant="outline">
							Clear Test Results
						</Button>
					</CardFooter>
				</Card>
			</section>

			{/* Bored Browsing Test */}
			<section className="space-y-8">
				<h2 className="text-2xl font-semibold">The "Bored Browsing Test"</h2>

				<Card variant="premium">
					<CardHeader>
						<CardTitle>Premium Feel Challenge</CardTitle>
						<CardDescription>
							Rapidly click, hover, and interact with everything above. Does it
							feel smooth, premium, and Apple-like even under stress?
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<Button onClick={() => runTest('Stress Test 1')}>
								<StarIcon className="mr-2" />
								Rapid Click 1
							</Button>
							<Button
								variant="outline"
								onClick={() => runTest('Stress Test 2')}
							>
								<StarIcon className="mr-2" />
								Rapid Click 2
							</Button>
							<Button
								variant="secondary"
								onClick={() => runTest('Stress Test 3')}
							>
								<StarIcon className="mr-2" />
								Rapid Click 3
							</Button>
							<Button variant="ghost" onClick={() => runTest('Stress Test 4')}>
								<StarIcon className="mr-2" />
								Rapid Click 4
							</Button>
						</div>
						<p className="text-sm text-muted-foreground mt-4">
							The true test: Does this feel as smooth and premium as Apple's own
							interfaces? No janky animations, no choppy transitions, no awkward
							timing.
						</p>
					</CardContent>
				</Card>
			</section>
		</div>
	)
}
