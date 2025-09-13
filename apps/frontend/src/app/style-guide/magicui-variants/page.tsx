// Kept import in case we want to compare original content vs bento layout quickly
import FeaturesDemo1 from '@/components/magicui/features-section-demo-1'
import { containerClasses } from '@/lib/design-system'
import type { Metadata } from 'next/types'
import { Suspense } from 'react'
import { TrendingUp, BarChart3, Users, Shield, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
	title: 'MagicUI Variants Playground',
	description:
		'Side-by-side demo of similar MagicUI sections to choose a single canonical variant.'
}

function BentoGrid() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-7 row-span-2 card-elevated-authority card-padding rounded-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="heading-lg mb-2 text-foreground">Reduce Vacancy by 65%</h3>
            <p className="body-md text-muted-foreground max-w-prose">
              Smart tenant screening and automated marketing fill units faster while ensuring quality tenants.
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>
      <div className="col-span-12 sm:col-span-6 lg:col-span-5 card-elevated-authority card-padding rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-foreground font-semibold">Increase NOI</div>
            <div className="text-muted-foreground text-sm">+40% average</div>
          </div>
        </div>
      </div>
      <div className="col-span-12 md:col-span-6 card-elevated-authority card-padding rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="heading-md mb-1">Automate 80% of Tasks</div>
            <p className="body-sm text-muted-foreground">Workflows handle rent collection, renewals, and communications.</p>
          </div>
        </div>
      </div>
      <div className="col-span-12 md:col-span-6 card-elevated-authority card-padding rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="heading-md mb-1">Enterprise Security</div>
            <p className="body-sm text-muted-foreground">SOC 2 compliant with role-based access and audit logs.</p>
          </div>
        </div>
      </div>
      <div className="col-span-12 card-elevated-authority card-padding rounded-2xl flex items-center justify-between">
        <div>
          <div className="heading-lg mb-1">See it in action</div>
          <p className="body-sm text-muted-foreground">Schedule a free demo tailored to your portfolio.</p>
        </div>
        <button className="btn-gradient-primary px-4 py-2 rounded-lg inline-flex items-center">
          Schedule Demo
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  )
}

export default function MagicUiVariantsPage() {
	return (
		<main className="min-h-screen bg-background">
			<section className="section-hero">
				<div className={containerClasses('xl')}>
					<h1 className="display-xl text-gradient-authority mb-2">
						MagicUI Variants Playground
					</h1>
					<p className="body-lg text-muted-foreground max-w-3xl">
						Compare similar components implemented in multiple variants. Pick
						one to keep and remove the rest for a consistent, maintainable
						design system.
					</p>
				</div>
			</section>

			<section className="section-content">
				<div className={containerClasses('xl')}>
          <h2 className="heading-xl mb-6">Features Section – Bento (Variant 1)</h2>
          <div className="rounded-2xl">
            <Suspense>
              <BentoGrid />
            </Suspense>
          </div>
        </div>
      </section>
		</main>
	)
}
