/**
 * UI Patterns - Next.js 15 Architecture
 * 
 * Decomposed from monolithic ui-patterns.tsx into focused components:
 * - Server components for static patterns
 * - Client islands for interactive behaviors  
 * - Single responsibility principle for maintainability
 */

// Interactive Components (Client)
export { InteractiveCard } from './interactive-card'

// Status & Indicators (Server)
export { 
  StatusBadge, 
  PriorityIndicator, 
  HealthIndicator 
} from './status-indicators'

// Metrics & Displays (Server)
export { 
  MetricCard, 
  StatGrid, 
  InlineMetric, 
  ComparisonMetric 
} from './metric-displays'

// List Patterns (Server)
export { 
  ListItem, 
  GroupedList, 
  FeedItem, 
  FeedList 
} from './list-patterns'