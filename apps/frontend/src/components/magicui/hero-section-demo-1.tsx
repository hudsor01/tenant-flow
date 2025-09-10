'use client'

import { 
  cn, 
  ANIMATION_DURATIONS,
  TYPOGRAPHY_SCALE 
} from "@/lib/design-system";

export default function HeroSectionOne() {
	return (
		<section 
			className="relative mx-auto my-10 flex max-w-7xl flex-col items-center justify-center"
			aria-labelledby="hero-heading"
		>
			<Navbar />
			<div className="absolute inset-y-0 left-0 h-full w-px bg-neutral-200/80 dark:bg-neutral-800/80">
				<div className="absolute top-0 h-40 w-px bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
			</div>
			<div className="absolute inset-y-0 right-0 h-full w-px bg-neutral-200/80 dark:bg-neutral-800/80">
				<div className="absolute h-40 w-px bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
			</div>
			<div className="absolute inset-x-0 bottom-0 h-px w-full bg-neutral-200/80 dark:bg-neutral-800/80">
				<div className="absolute mx-auto h-px w-40 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
			</div>
			<div className="px-4 py-10 md:py-20">
				<h1 
					id="hero-heading"
					className={cn(
						"relative z-10 mx-auto max-w-4xl text-center font-bold",
						"text-foreground",
						"transition-colors duration-300 ease-out",
						// Modern SaaS typography with better responsiveness
						"text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl",
						"leading-[0.9] tracking-tight"
					)}
					style={{
						fontSize: TYPOGRAPHY_SCALE['display-2xl'].fontSize,
						lineHeight: TYPOGRAPHY_SCALE['display-2xl'].lineHeight,
						fontWeight: TYPOGRAPHY_SCALE['display-2xl'].fontWeight,
						letterSpacing: TYPOGRAPHY_SCALE['display-2xl'].letterSpacing
					}}
				>
					{'Launch your website in hours, not days'
						.split(' ')
						.map((word, index) => (
							<span
								key={index}
								className={cn(
									"mr-2 inline-block transition-all ease-out",
									"hover:text-primary hover:scale-105"
								)}
								style={{
									animationDelay: `${index * 100}ms`,
									transition: `all ${ANIMATION_DURATIONS.fast}ms ease-out`
								}}
							>
								{word}
							</span>
						))}
				</h1>
				<p
					data-initial={{
						opacity: 0
					}}
					data-animate={{
						opacity: 1
					}}
					data-transition={{
						duration: 0.3,
						delay: 0.8
					}}
					className="relative z-10 mx-auto max-w-xl py-4 text-center text-lg font-normal text-neutral-600 dark:text-neutral-400"
				>
					With AI, you can launch your website in hours, not days. Try our best
					in class, state of the art, cutting edge AI tools to get your website
					up.
				</p>
				<div
					data-initial={{
						opacity: 0
					}}
					data-animate={{
						opacity: 1
					}}
					data-transition={{
						duration: 0.3,
						delay: 1
					}}
					className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4"
				>
					<button 
						className={cn(
							"group relative overflow-hidden",
							"w-full sm:w-60 rounded-xl bg-primary px-8 py-4 font-semibold text-primary-foreground",
							"transition-all duration-200 ease-out",
							"hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98]",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
							"shadow-lg shadow-primary/25"
						)}
						aria-label="Start exploring features"
					>
						<span className="relative z-10">Explore Now</span>
					</button>
					<button 
						className={cn(
							"group relative overflow-hidden",
							"w-full sm:w-60 rounded-xl border border-border bg-background px-8 py-4 font-semibold text-foreground",
							"transition-all duration-200 ease-out",
							"hover:scale-[1.02] hover:bg-muted active:scale-[0.98]",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
						)}
						aria-label="Contact support team"
					>
						<span className="relative z-10">Contact Support</span>
					</button>
				</div>
				<div
					data-initial={{
						opacity: 0,
						y: 10
					}}
					data-animate={{
						opacity: 1,
						y: 0
					}}
					data-transition={{
						duration: 0.3,
						delay: 1.2
					}}
					className="relative z-10 mt-20 rounded-3xl border border-neutral-200 bg-neutral-100 p-4 shadow-md dark:border-neutral-800 dark:bg-neutral-900"
				>
					<div className="w-full overflow-hidden rounded-xl border border-gray-300 dark:border-gray-700">
						<img
							src="https://assets.aceternity.com/pro/aceternity-landing.webp"
							alt="Landing page preview"
							className="aspect-video h-auto w-full object-cover"
							height={1000}
							width={1000}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}

const Navbar = () => {
	return (
		<nav className="flex w-full items-center justify-between border-t border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
			<div className="flex items-center gap-2">
				<div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500" />
				<h1 className="text-base font-bold md:text-2xl">Aceternity UI</h1>
			</div>
			<button className="w-24 transform rounded-lg bg-black px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-800 md:w-32 dark:bg-white dark:text-black dark:hover:bg-gray-200">
				Login
			</button>
		</nav>
	)
}
