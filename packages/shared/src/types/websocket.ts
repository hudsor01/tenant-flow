/**
 * WebSocket types
 * Types for real-time communication
 */

export interface WebSocketMessage {
  type: string
  data: unknown
  timestamp?: string
  userId?: string
}

// Specific message types for type safety
export interface MaintenanceUpdateMessage extends WebSocketMessage {
  type: 'maintenance_update'
  data: {
    id: string
    type: string
    status?: string
    priority?: string
    unitId?: string
    assignedTo?: string
    metadata?: Record<string, string | number | boolean | null>
  }
}

// Union type for all specific message types
export type TypedWebSocketMessage = MaintenanceUpdateMessage | WebSocketMessage

// UseWebSocketOptions is defined in notifications.ts