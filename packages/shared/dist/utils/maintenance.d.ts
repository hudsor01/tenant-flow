/**
 * Maintenance utilities
 * Helper functions for maintenance priority and status display
 */
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
type RequestStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'ON_HOLD';
export declare const getPriorityLabel: (priority: Priority) => string;
export declare const getPriorityColor: (priority: Priority) => string;
export declare const getRequestStatusLabel: (status: RequestStatus) => string;
export declare const getRequestStatusColor: (status: RequestStatus) => string;
export {};
