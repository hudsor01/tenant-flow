'use client'

import { safeScript } from '#lib/dom-utils'
import { cn } from '#lib/utils'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { StripePricingTableProps } from '@repo/shared/types/core'
import { useEffect, useMemo, useState } from 'react'

const logger = createLogger({ component: 'StripePricingTable' })

export function StripePricingTable({
	pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID ||
		'prctbl_1SBGrNP3WCR53SdoJjTotskB', // Production pricing table ID
	clientReferenceId,
	customerEmail,
	customerSessionClientSecret,
	className
}: StripePricingTableProps) {
	const [isScriptLoaded, setIsScriptLoaded] = useState(false)
	const isPlaceholderId = useMemo(
		() =>
			pricingTableId === 'prctbl_placeholder' ||
			pricingTableId === 'prctbl_1234567890',
		[pricingTableId]
	)

	const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

	useEffect(() => {
		if (isPlaceholderId) {
			logger.info('Stripe pricing table needs configuration', {
				action: 'stripe_pricing_table_placeholder',
				metadata: { pricingTableId }
			})
			return
		}

		if (!publishableKey) {
			logger.error('Missing publishable key for Stripe pricing table', {
				action: 'stripe_pricing_table_missing_key',
				metadata: { pricingTableId }
			})
			return
		}

		let isMounted = true

		const loadScript = async () => {
			const loaded = await safeScript.load(
				'https://js.stripe.com/v3/pricing-table.js'
			)
			if (isMounted) {
				setIsScriptLoaded(loaded)
			}
			if (!loaded) {
				logger.error('Failed to load Stripe pricing table script', {
					action: 'stripe_script_load_failed',
					metadata: { pricingTableId }
				})
			}
		}

		loadScript().catch(error => {
			if (!isMounted) return
			logger.error(
				'Unexpected error while loading Stripe pricing table script',
				{
					action: 'stripe_script_load_error',
					metadata: {
						pricingTableId,
						error: error instanceof Error ? error.message : String(error)
					}
				}
			)
		})

		return () => {
			isMounted = false
		}
	}, [isPlaceholderId, pricingTableId, publishableKey])

	if (isPlaceholderId) {
		return (
			<div className={cn('stripe-pricing-table-container', className)}>
				<StripePricingTablePlaceholder pricingTableId={pricingTableId} />
			</div>
		)
	}

	if (!publishableKey) {
		return (
			<div className={cn('stripe-pricing-table-container', className)}>
				<ConfigurationErrorMessage />
			</div>
		)
	}

	return (
		<div className={cn('stripe-pricing-table-container', className)}>
			{isScriptLoaded ? (
				<stripe-pricing-table
					pricing-table-id={pricingTableId}
					publishable-key={publishableKey}
					{...(clientReferenceId
						? { 'client-reference-id': clientReferenceId }
						: {})}
					{...(customerEmail ? { 'customer-email': customerEmail } : {})}
					{...(customerSessionClientSecret
						? { 'customer-session-client-secret': customerSessionClientSecret }
						: {})}
				/>
			) : (
				<LoadingMessage />
			)}
		</div>
	)
}

function LoadingMessage() {
	return (
		<div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-fill-secondary)] p-6 text-center text-sm text-[var(--color-label-secondary)]">
			Preparing secure Stripe pricing table…
		</div>
	)
}

function ConfigurationErrorMessage() {
	return (
		<div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-fill-secondary)] p-6 text-center text-sm text-[var(--color-label-secondary)]">
			Stripe publishable key is missing. Add{' '}
			<code className="rounded bg-[var(--color-fill-primary)] px-1 py-0.5 text-xs">
				NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
			</code>{' '}
			to Doppler configuration.
		</div>
	)
}

function StripePricingTablePlaceholder({
	pricingTableId
}: {
	pricingTableId: string
}) {
	return (
		<div className="rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-fill-secondary)] p-10 text-left text-[var(--color-label-secondary)]">
			<h3 className="mb-4 text-center text-xl font-semibold text-[var(--color-label-primary)]">
				Stripe Pricing Table Configuration Required
			</h3>
			<p className="mx-auto mb-6 max-w-2xl text-center">
				Stripe pricing tables provide a secure, no-code checkout experience.
				Configure your pricing table in the Stripe Dashboard and update Doppler
				with the generated ID.
			</p>
			<div className="mx-auto max-w-2xl rounded-lg bg-[var(--color-fill-primary)] p-6">
				<h4 className="mb-3 font-medium text-[var(--color-label-primary)]">
					Setup Instructions
				</h4>
				<ol className="list-decimal space-y-2 pl-6 text-sm">
					<li>
						Visit{' '}
						<a
							className="text-[var(--color-primary-brand)] underline"
							href="https://dashboard.stripe.com/pricing-tables"
							rel="noreferrer"
							target="_blank"
						>
							Stripe Dashboard → Pricing tables
						</a>
					</li>
					<li>Create a pricing table and add your products</li>
					<li>Copy the generated pricing table ID (starts with prctbl_)</li>
					<li>
						Update Doppler:
						<code className="ml-1 rounded bg-[var(--color-fill-secondary)] px-1 py-0.5 text-xs">
							doppler secrets set STRIPE_PRICING_TABLE_ID {pricingTableId}
						</code>
					</li>
				</ol>
			</div>
			<div className="mx-auto mt-6 max-w-2xl rounded-lg bg-[var(--color-system-yellow-bg)] p-4 text-sm text-[var(--color-system-yellow)]">
				<strong>Note:</strong> Pricing tables include secure checkout, customer
				portal links, and automatic tax calculation.
			</div>
		</div>
	)
}
