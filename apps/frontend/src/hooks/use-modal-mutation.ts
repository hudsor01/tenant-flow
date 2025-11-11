import { createLogger } from '@repo/shared/lib/frontend-logger'
import { useModalStore } from '../stores/modal-store'

const logger = createLogger({ component: 'ModalQuery' })

export function useModalMutation<
	TData = unknown,
	TError = unknown,
	TVariables = unknown,
	TContext = unknown
>(mutationOptions: {
	mutationFn: (variables: TVariables) => Promise<TData>
	onSuccess?: (data: TData, variables: TVariables, context: TContext) => void
	onError?: (error: TError, variables: TVariables, context: TContext) => void
	modalId?: string | undefined
}) {
	const { closeOnMutationSuccess } = useModalStore()
	const { mutationFn, onSuccess, onError, modalId, ...rest } = mutationOptions

	const result: {
		mutationFn: (variables: TVariables) => Promise<TData>
		onSuccess?: (data: TData, variables: TVariables, context: TContext) => void
		onError?: (error: TError, variables: TVariables, context: TContext) => void
		meta?: { modalId: string }
	} = {
		...rest,
		mutationFn,
		...(onSuccess
			? {
					onSuccess: (data: TData, variables: TVariables, context: TContext) => {
						if (modalId) {
							logger.info('Modal mutation succeeded', {
								action: 'modal_mutation_success',
								metadata: { modalId }
							})
							closeOnMutationSuccess(modalId)
						}
						onSuccess(data, variables, context)
					}
				}
			: {}),
		...(onError
			? {
					onError: (error: TError, variables: TVariables, context: TContext) => {
						if (modalId) {
							logger.error('Modal mutation failed', {
								action: 'modal_mutation_error',
								metadata: {
									modalId,
									error: error instanceof Error ? error.message : String(error)
								}
							})
						}
						onError(error, variables, context)
					}
				}
			: {}),
		...(modalId ? { meta: { modalId } } : {})
	}

	return result
}
