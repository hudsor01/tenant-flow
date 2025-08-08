/**
 * Boundary exports to avoid react-refresh warnings
 */
export { 
  SuspenseBoundary, 
  DataTableBoundary, 
  FormBoundary, 
  CardListBoundary,
  MinimalBoundary,
  type LoadingVariant
} from './suspense-boundary'
export { ErrorBoundaryWrapper } from './error-boundary-wrapper'
export { useBoundaryReset, useErrorReporting } from './boundary-hooks'