"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { MaintenanceListRow } from "#hooks/api/query-keys/maintenance-mappers";
import { MaintenanceCard } from "./maintenance-card";

interface MaintenanceSortableCardProps {
	request: MaintenanceListRow;
	columnId: string;
	onView?: (id: string) => void;
}

export function MaintenanceSortableCard({
	request,
	columnId,
	onView,
}: MaintenanceSortableCardProps) {
	// Pointer listeners only. The board has no KeyboardSensor, so dnd-kit's
	// `attributes` (role="button", tabIndex 0, the drag instructions) made a tab
	// stop that no key operates, wrapped around the card's own link: axe's
	// nested-interactive failed every card (WCAG 4.1.2; 66.2-39 fix round 4,
	// Part 8h). The card's link stays the keyboard control.
	const { listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({
			id: request.id,
			data: {
				type: "maintenance-request",
				request,
				columnId,
			},
		});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		cursor: isDragging ? "grabbing" : "grab",
	};

	return (
		<div ref={setNodeRef} style={style} {...listeners}>
			<MaintenanceCard
				request={request}
				isDragging={isDragging}
				onView={onView}
			/>
		</div>
	);
}
