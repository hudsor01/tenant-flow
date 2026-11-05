"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "#components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#components/ui/tooltip";
import type { DocumentCategoryRow } from "#hooks/api/query-keys/document-category-keys";

interface CategoryRowProps {
	category: DocumentCategoryRow;
	onEdit: (c: DocumentCategoryRow) => void;
	onDelete: (c: DocumentCategoryRow) => void;
}

/**
 * Single category row in the settings list. Drag handle + label + slug
 * + rename + delete. A default category's delete button is aria-disabled
 * and its tooltip says why (the RPC also rejects server-side as
 * defense-in-depth).
 */
export function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: category.id });
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1,
	};
	return (
		// The actions wrap onto a line of their own when the label column
		// would get less than 7rem beside them: below 48rem each control is a
		// 44px touch target, and at 320px the three left the label and slug
		// no width at all. The slug breaks anywhere, so a long one wraps
		// rather than running past the row (and the page) at 320px.
		<li
			ref={setNodeRef}
			style={style}
			className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-background px-3 py-2"
		>
			<button
				type="button"
				className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
				aria-label={`Drag to reorder ${category.label}`}
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-4" aria-hidden="true" />
			</button>
			<div className="min-w-0 grow basis-28">
				<div className="flex items-center gap-2">
					<span className="font-medium truncate">{category.label}</span>
					{category.is_default && (
						<span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
							Default
						</span>
					)}
				</div>
				<code className="text-xs text-muted-foreground wrap-anywhere">
					{category.slug}
				</code>
			</div>
			<div className="ml-auto flex items-center gap-3">
				<Button
					variant="ghost"
					size="sm"
					className="size-9 p-0"
					onClick={() => onEdit(category)}
					aria-label={`Rename ${category.label}`}
				>
					<Pencil className="size-4" aria-hidden="true" />
				</Button>
				{category.is_default ? (
					<Tooltip>
						<TooltipTrigger asChild>
							{/* One focusable control: `aria-disabled` rather than `disabled`,
							    so the button keeps its tab stop and pointer events and the
							    tooltip opens on focus and hover alike. It has no handler. */}
							<Button
								variant="ghost"
								size="sm"
								className="size-9 cursor-not-allowed p-0 text-muted-foreground opacity-50 hover:bg-transparent hover:text-muted-foreground dark:hover:bg-transparent dark:hover:text-muted-foreground"
								aria-disabled="true"
								aria-label={`Delete ${category.label}`}
							>
								<Trash2 className="size-4" aria-hidden="true" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							Default categories can&rsquo;t be deleted.
						</TooltipContent>
					</Tooltip>
				) : (
					<Button
						variant="ghost"
						size="sm"
						className="size-9 p-0"
						onClick={() => onDelete(category)}
						aria-label={`Delete ${category.label}`}
					>
						<Trash2 className="size-4" aria-hidden="true" />
					</Button>
				)}
			</div>
		</li>
	);
}
