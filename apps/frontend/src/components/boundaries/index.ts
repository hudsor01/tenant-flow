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
} from './SuspenseBoundary'
export { useBoundaryReset, useErrorReporting } from './boundary-hooks'