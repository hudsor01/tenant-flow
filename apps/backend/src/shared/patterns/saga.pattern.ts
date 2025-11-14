/**
 * Saga Pattern Implementation for Transaction Compensation

 * Implements the Saga pattern for distributed transactions across Supabase, Stripe, and Storage.
 * Provides automatic compensation (rollback) when operations fail.

 * @see docs/CRUD_BUGS_FIXES_2025.md - Bug #3: Transaction Compensation
 */

import { Logger } from '@nestjs/common'

export interface SagaStep<T = unknown> {
	/** Human-readable step name for logging */
	name: string
	/** Execute the forward operation */
	execute: () => Promise<T>
	/** Compensate (undo) the operation if it was successful */
	compensate: (result: T) => Promise<void>
}

export interface SagaResult<T> {
	success: boolean
	data?: T
	error?: Error
	/** Steps that were successfully executed (for debugging) */
	completedSteps: string[]
	/** Steps that were compensated (for debugging) */
	compensatedSteps: string[]
}

/**
 * Execute a saga with automatic compensation on failure

 * @example
 * const result = await executeSaga([
 * {
 * name: 'Delete from Supabase',
 * execute: () => supabase.from('properties').delete().eq('id', id),
 * compensate: () => supabase.from('properties').insert(originalData)
 * },
 * {
 * name: 'Delete Stripe customer',
 * execute: () => stripe.customers.del(stripeId),
 * compensate: () => stripe.customers.create(originalStripeData)
 * }
 * ])
 */
export async function executeSaga<T = unknown>(
	steps: SagaStep<unknown>[],
	logger?: Logger
): Promise<SagaResult<T>> {
	const log = logger || new Logger('Saga')
	const executedSteps: Array<{ name: string; result: unknown }> = []
	const completedSteps: string[] = []
	const compensatedSteps: string[] = []

	try {
		// Forward phase: Execute all steps
		for (const step of steps) {
			log.log(`Executing saga step: ${step.name}`)
			const result = await step.execute()
			executedSteps.push({ name: step.name, result })
			completedSteps.push(step.name)
			log.log(` Saga step completed: ${step.name}`)
		}

		// All steps succeeded
		return {
			success: true,
			data: executedSteps[executedSteps.length - 1]?.result as T,
			completedSteps,
			compensatedSteps
		}
	} catch (error) {
		// Compensation phase: Rollback completed steps in reverse order
		const lastStep = executedSteps[executedSteps.length - 1]
		log.error(
			`Saga failed at step: ${lastStep?.name || 'unknown'}`,
			{ error: error instanceof Error ? error.message : String(error) }
		)

		// Compensate in reverse order
		for (let i = executedSteps.length - 1; i >= 0; i--) {
			const executedStep = executedSteps[i]
			if (!executedStep) continue
			
			const { name, result } = executedStep
			const step = steps[i]
			if (!step) continue

			try {
				log.warn(`Compensating saga step: ${name}`)
				await step.compensate(result)
				compensatedSteps.push(name)
				log.log(` Saga step compensated: ${name}`)
			} catch (compensationError) {
				log.error(` Failed to compensate saga step: ${name}`, {
					error:
						compensationError instanceof Error
							? compensationError.message
							: String(compensationError)
				})
				// Continue compensating other steps even if one fails
			}
		}

		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
			completedSteps,
			compensatedSteps
		}
	}
}

/**
 * Create a no-op compensation step (when compensation is not possible/needed)
 */
export function noCompensation(): Promise<void> {
	return Promise.resolve()
}

/**
 * Saga builder for fluent API

 * @example
 * const result = await new SagaBuilder()
 * .addStep({
 * name: 'Delete property',
 * execute: () => deleteProperty(),
 * compensate: () => restoreProperty()
 * })
 * .addStep({
 * name: 'Delete images',
 * execute: () => deleteImages(),
 * compensate: () => restoreImages()
 * })
 * .execute()
 */
export class SagaBuilder {
	private steps: SagaStep<unknown>[] = []
	private logger: Logger | undefined

	constructor(logger?: Logger) {
		this.logger = logger
	}

	addStep<T = unknown>(step: SagaStep<T>): this {
		this.steps.push(step as SagaStep<unknown>)
		return this
	}

	async execute<T = unknown>(): Promise<SagaResult<T>> {
		return executeSaga<T>(this.steps, this.logger)
	}
}
