/**
 * WebSocket types
 * Types for real-time communication
 */
export interface WebSocketMessage {
    type: string;
    data: unknown;
    timestamp?: string;
    userId?: string;
}
export interface MaintenanceUpdateMessage extends WebSocketMessage {
    type: 'maintenance_update';
    data: {
        id: string;
        type: string;
        status?: string;
        priority?: string;
        unitId?: string;
        assignedTo?: string;
        metadata?: Record<string, string | number | boolean | null>;
    };
}
export type TypedWebSocketMessage = MaintenanceUpdateMessage | WebSocketMessage;
//# sourceMappingURL=websocket.d.ts.map