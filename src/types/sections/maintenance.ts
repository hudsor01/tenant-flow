// Maintenance Section Types

export interface TimelineEvent {
	id: string;
	type: MaintenanceTimelineEventType;
	title: string;
	description?: string;
	timestamp: string;
	actor?: string;
}

export type MaintenanceTimelineEventType =
	| "created"
	| "assigned"
	| "status_change"
	| "expense_added"
	| "note_added"
	| "photo_added"
	| "scheduled"
	| "completed";
