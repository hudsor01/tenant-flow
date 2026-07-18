import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HeroDashboardMockup } from "#components/sections/hero-dashboard-mockup";
import { Button } from "#components/ui/button";
import type { HeroSectionProps } from "#types/frontend";

export function HeroSection({
	trustBadge,
	title,
	titleHighlight,
	subtitle,
	primaryCta,
	secondaryCta,
	trustSignals,
	image,
	brandArt,
}: HeroSectionProps) {
	const hasVisual = Boolean(image) || Boolean(brandArt);
	return (
		<section className="relative flex-1 flex flex-col">
			{/* Trust Badge */}
			{trustBadge && (
				<div className="pb-8 text-center">
					<div className="inline-flex-center px-6 py-3 rounded-full border border-primary/25 bg-primary/10">
						<div
							className="size-2 bg-success rounded-full mr-3 animate-pulse"
							aria-hidden="true"
						/>
						<span className="text-muted-foreground font-medium text-sm">
							{trustBadge}
						</span>
					</div>
				</div>
			)}

			{/* Hero Container - Full Width */}
			<div className="flex-1 w-full">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div
						className={
							hasVisual
								? "grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-150"
								: "flex flex-col items-center justify-center min-h-100 text-center"
						}
					>
						{/* Content */}
						<div
							className={
								hasVisual
									? "flex flex-col justify-center space-y-8"
									: "flex flex-col items-center space-y-8 max-w-4xl"
							}
						>
							<div className="space-y-6">
								<h1 className="text-responsive-display-xl font-bold text-foreground tracking-tight leading-[1.1]">
									{title}{" "}
									{titleHighlight && (
										<span className="hero-highlight">{titleHighlight}</span>
									)}
								</h1>

								<p
									className={`text-xl text-muted-foreground leading-relaxed ${image ? "max-w-lg" : "max-w-2xl"}`}
								>
									{subtitle}
								</p>
							</div>

							<div className="flex flex-row gap-4">
								<Button asChild>
									<Link href={primaryCta.href}>
										{primaryCta.label}
										<ArrowRight className="ml-2 size-4" />
									</Link>
								</Button>
								<Button variant="outline" asChild>
									<Link href={secondaryCta.href}>{secondaryCta.label}</Link>
								</Button>
							</div>

							{trustSignals && (
								<p className="text-muted-foreground font-medium">
									{trustSignals}
								</p>
							)}
						</div>

						{/* Hero visual — brand product mockup (preferred) or, for
							legacy callers, an explicit image. Never stock photography. */}
						{brandArt ? (
							<HeroDashboardMockup />
						) : image ? (
							<div className="relative">
								<div className="relative h-150 rounded-3xl overflow-hidden shadow-2xl">
									<Image
										src={image.src}
										alt={image.alt}
										fill
										className="object-cover"
										priority
										sizes="(max-width: 768px) 100vw, 50vw"
										placeholder="blur"
										blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
									/>
								</div>
							</div>
						) : null}
					</div>
				</div>
			</div>
		</section>
	);
}
