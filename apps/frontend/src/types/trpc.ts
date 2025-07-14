// Re-export AppRouter type from backend
export type { AppRouter } from '../../../backend/src/trpc/app-router'

// Frontend-specific type helpers
export type TRPCQuerySuccessResult<TData> = {
  data: TData
  error: null
  isLoading: false
  isError: false
  isSuccess: true
}

export type TRPCQueryErrorResult = {
  data: undefined
  error: Error
  isLoading: false
  isError: true
  isSuccess: false
}

export type TRPCQueryLoadingResult = {
  data: undefined
  error: null
  isLoading: true
  isError: false
  isSuccess: false
}

export type TRPCQueryResult<TData> = 
  | TRPCQuerySuccessResult<TData>
  | TRPCQueryErrorResult
  | TRPCQueryLoadingResult

// Mutation result types
export type TRPCMutationResult<TData, TError = Error> = {
  mutate: (input: any) => void
  mutateAsync: (input: any) => Promise<TData>
  data?: TData
  error?: TError
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  reset: () => void
}
