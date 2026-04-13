import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageLayout } from '#components/layout/page-layout'
import { Button } from '#components/ui/button'
import { PrintButton } from '#components/shared/print-button'
import { RelatedArticles } from '#components/blog/related-articles'
import { RESOURCE_TO_BLOGS } from '#lib/content-links'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { createPageMetadata } from '#lib/seo/page-metadata'

export const metadata: Metadata = createPageMetadata({
	title: 'Seasonal Maintenance Checklist for Rental Properties',
	description:
		'Free printable season-by-season maintenance checklist for landlords. Covers HVAC, plumbing, electrical, exterior, and safety inspections.',
	path: '/resources/seasonal-maintenance-checklist'
})

const seasons = [
	{
		name: 'Spring (March - May)',
		color: 'bg-green-50 border-green-200',
		headerColor: 'bg-green-100 text-green-900',
		tasks: [
			{ area: 'Exterior', task: 'Inspect roof for winter damage, missing or loose shingles' },
			{ area: 'Exterior', task: 'Clean gutters and downspouts; check drainage away from foundation' },
			{ area: 'Exterior', task: 'Inspect siding, trim, and paint for peeling or damage' },
			{ area: 'Exterior', task: 'Check walkways, driveways, and parking areas for cracks or heaving' },
			{ area: 'Landscaping', task: 'Trim trees and shrubs away from building and power lines' },
			{ area: 'Landscaping', task: 'Inspect and repair sprinkler system; adjust heads' },
			{ area: 'Landscaping', task: 'Apply fresh mulch to beds; reseed bare lawn patches' },
			{ area: 'HVAC', task: 'Schedule A/C tune-up; replace filters' },
			{ area: 'HVAC', task: 'Clean condenser coils and check refrigerant levels' },
			{ area: 'Plumbing', task: 'Reconnect and test exterior hose bibs' },
			{ area: 'Plumbing', task: 'Check for leaks under sinks and around water heater' },
			{ area: 'Safety', task: 'Test smoke detectors and CO detectors; replace batteries' },
			{ area: 'Safety', task: 'Inspect fire extinguishers (check gauge and expiration)' },
			{ area: 'General', task: 'Touch up interior paint in common areas' },
			{ area: 'General', task: 'Check caulking around windows, doors, tubs, and showers' },
		],
	},
	{
		name: 'Summer (June - August)',
		color: 'bg-amber-50 border-amber-200',
		headerColor: 'bg-amber-100 text-amber-900',
		tasks: [
			{ area: 'HVAC', task: 'Replace A/C filters monthly during peak cooling season' },
			{ area: 'HVAC', task: 'Check thermostat operation and calibration' },
			{ area: 'HVAC', task: 'Ensure condensate drain line is clear (pour vinegar monthly)' },
			{ area: 'Exterior', task: 'Power wash siding, decks, patios, and walkways' },
			{ area: 'Exterior', task: 'Inspect and seal deck/patio wood surfaces' },
			{ area: 'Exterior', task: 'Check exterior lighting fixtures and replace bulbs' },
			{ area: 'Pest Control', task: 'Inspect for ant trails, wasp nests, and termite tubes' },
			{ area: 'Pest Control', task: 'Schedule professional pest treatment if needed' },
			{ area: 'Plumbing', task: 'Inspect washing machine hoses for bulging or cracks' },
			{ area: 'Plumbing', task: 'Test sump pump operation (pour water into pit)' },
			{ area: 'Safety', task: 'Check window and door locks for proper operation' },
			{ area: 'Safety', task: 'Verify exterior security lighting works (dusk-to-dawn)' },
			{ area: 'Appliances', task: 'Clean refrigerator coils and check door seals' },
			{ area: 'Appliances', task: 'Run dishwasher empty with vinegar to remove buildup' },
		],
	},
	{
		name: 'Fall (September - November)',
		color: 'bg-orange-50 border-orange-200',
		headerColor: 'bg-orange-100 text-orange-900',
		tasks: [
			{ area: 'HVAC', task: 'Schedule furnace/heating system inspection and tune-up' },
			{ area: 'HVAC', task: 'Replace furnace filter; stock extras for winter' },
			{ area: 'HVAC', task: 'Bleed radiators if applicable (hot water heating systems)' },
			{ area: 'Exterior', task: 'Clean gutters after leaves fall (late October/November)' },
			{ area: 'Exterior', task: 'Inspect roof flashing around vents, chimneys, skylights' },
			{ area: 'Exterior', task: 'Seal gaps around windows and doors with weatherstripping' },
			{ area: 'Plumbing', task: 'Disconnect and drain exterior hoses' },
			{ area: 'Plumbing', task: 'Insulate exposed pipes in crawl spaces, garages, and attics' },
			{ area: 'Plumbing', task: 'Shut off and drain exterior hose bibs (if not frost-free)' },
			{ area: 'Plumbing', task: 'Flush water heater to remove sediment buildup' },
			{ area: 'Safety', task: 'Test smoke and CO detectors; replace batteries (daylight saving)' },
			{ area: 'Safety', task: 'Check furnace exhaust vent for blockages' },
			{ area: 'Landscaping', task: 'Aerate lawn and apply fall fertilizer' },
			{ area: 'Landscaping', task: 'Winterize sprinkler system (blow out lines)' },
			{ area: 'General', task: 'Check attic insulation depth (R-38 minimum recommended)' },
			{ area: 'General', task: 'Inspect chimney and schedule cleaning if wood-burning' },
		],
	},
	{
		name: 'Winter (December - February)',
		color: 'bg-blue-50 border-blue-200',
		headerColor: 'bg-blue-100 text-blue-900',
		tasks: [
			{ area: 'HVAC', task: 'Replace furnace filter monthly during peak heating' },
			{ area: 'HVAC', task: 'Monitor heating system for unusual noises or smells' },
			{ area: 'HVAC', task: 'Keep vents and registers clear of furniture and rugs' },
			{ area: 'Plumbing', task: 'Monitor for frozen pipes during extreme cold snaps' },
			{ area: 'Plumbing', task: 'Know location of main water shut-off valve' },
			{ area: 'Plumbing', task: 'Run faucets to a trickle during sub-zero nights (if needed)' },
			{ area: 'Exterior', task: 'Keep walkways and stairs clear of ice and snow' },
			{ area: 'Exterior', task: 'Stock ice melt or sand for common areas' },
			{ area: 'Exterior', task: 'Monitor roof for ice dams; remove if forming' },
			{ area: 'Safety', task: 'Ensure carbon monoxide detectors are working (heating season critical)' },
			{ area: 'Safety', task: 'Check that space heaters (if permitted) meet safety standards' },
			{ area: 'General', task: 'Plan and budget for spring maintenance and capital projects' },
			{ area: 'General', task: 'Review vendor contracts and get bids for spring work' },
			{ area: 'General', task: 'Inspect interior for drafts around windows and outlets' },
		],
	},
]

export default function SeasonalMaintenanceChecklistPage() {
	const howToSchema = {
		'@type': 'HowTo' as const,
		name: 'Seasonal Maintenance Checklist for Rental Properties',
		description:
			'A comprehensive season-by-season maintenance checklist covering HVAC, plumbing, electrical, exterior, safety, and landscaping inspections.',
		step: seasons.map(season => ({
			'@type': 'HowToSection' as const,
			name: season.name,
			itemListElement: season.tasks.map(task => ({
				'@type': 'HowToStep' as const,
				name: task.task,
				text: `[${task.area}] ${task.task}`,
			})),
		})),
	}

	const breadcrumbSchema = createBreadcrumbJsonLd(
		'/resources/seasonal-maintenance-checklist',
		{ 'seasonal-maintenance-checklist': 'Seasonal Maintenance Checklist' }
	)

	return (
		<PageLayout>
			<JsonLdScript schema={howToSchema} />
			<JsonLdScript schema={breadcrumbSchema} />
			{/* Print styles */}
			<style
				dangerouslySetInnerHTML={{
					__html: `
						@media print {
							nav, footer, .print\\:hidden { display: none !important; }
							body { font-size: 11px; }
							.page-break { page-break-before: always; }
							table { page-break-inside: avoid; }
						}
					`,
				}}
			/>

			<div className="max-w-4xl mx-auto px-6 lg:px-8 page-content pb-16">
				{/* Back link */}
				<div className="flex items-center justify-between mb-8 print:hidden">
					<Link
						href="/resources"
						className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
					>
						<ArrowLeft className="size-4 mr-2" />
						Back to Resources
					</Link>
					<PrintButton />
				</div>

				{/* Header */}
				<header className="mb-12 text-center">
					<p className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
						Free Resource
					</p>
					<h1 className="text-4xl font-bold text-foreground mb-4">
						Seasonal Maintenance Checklist for Rental Properties
					</h1>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						A comprehensive season-by-season checklist covering HVAC, plumbing, electrical,
						exterior, safety, and landscaping inspections. Print it and keep it with your
						property files.
					</p>
				</header>

				{/* Seasons */}
				<div className="space-y-12">
					{seasons.map((season, si) => (
						<section
							key={season.name}
							className={si > 0 ? 'page-break' : undefined}
						>
							<h2 className="text-2xl font-bold text-foreground mb-4">
								{season.name}
							</h2>
							<div
								className={`rounded-xl border ${season.color} overflow-hidden`}
							>
								<table className="w-full">
									<thead>
										<tr
											className={season.headerColor}
										>
											<th className="w-10 p-3 text-center text-sm font-semibold">
												Done
											</th>
											<th className="p-3 text-left text-sm font-semibold w-32">
												Area
											</th>
											<th className="p-3 text-left text-sm font-semibold">
												Task
											</th>
										</tr>
									</thead>
									<tbody>
										{season.tasks.map(
											(item, i) => (
												<tr
													key={i}
													className={
														i % 2 === 0
															? 'bg-background/50'
															: 'bg-background/80'
													}
												>
													<td className="p-3 text-center">
														<div className="size-5 border-2 border-muted-foreground/40 rounded mx-auto" />
													</td>
													<td className="p-3 text-sm font-medium text-foreground">
														{item.area}
													</td>
													<td className="p-3 text-sm text-muted-foreground">
														{item.task}
													</td>
												</tr>
											)
										)}
									</tbody>
								</table>
							</div>
						</section>
					))}
				</div>

				{/* Notes section */}
				<section className="mt-12 page-break">
					<h2 className="text-2xl font-bold text-foreground mb-4">
						Notes
					</h2>
					<div className="border border-border rounded-xl p-6 min-h-48">
						<div className="space-y-8">
							{[1, 2, 3, 4, 5, 6].map(i => (
								<div
									key={i}
									className="border-b border-dashed border-muted-foreground/20"
								/>
							))}
						</div>
					</div>
				</section>

				<RelatedArticles
					slugs={RESOURCE_TO_BLOGS['seasonal-maintenance-checklist'] ?? []}
					title="Related Blog Posts"
				/>

				{/* Footer CTA */}
				<div className="mt-12 text-center print:hidden">
					<p className="text-muted-foreground mb-4">
						Track maintenance requests digitally with TenantFlow
					</p>
					<Button asChild>
						<Link href="/pricing">Start Free Trial</Link>
					</Button>
				</div>
			</div>
		</PageLayout>
	)
}
