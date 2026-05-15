"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "#components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
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
 * + rename + delete. Default categories surface a tooltip-disabled
 * delete button (the RPC also rejects server-side as defense-in-depth).
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
		<li
			ref={setNodeRef}
			style={style}
			className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
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
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="font-medium truncate">{category.label}</span>
					{category.is_default && (
						<span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
							Default
						</span>
					)}
				</div>
				<code className="text-xs text-muted-foreground">{category.slug}</code>
			</div>
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
				<TooltipProvider delayDuration={150}>
					<Tooltip>
						<TooltipTrigger asChild>
							<span tabIndex={0}>
								<Button
									variant="ghost"
									size="sm"
									className="size-9 p-0 text-muted-foreground"
									disabled
									aria-label="Default categories can't be deleted"
								>
									<Trash2 className="size-4" aria-hidden="true" />
								</Button>
							</span>
						</TooltipTrigger>
						<TooltipContent>
							Default categories can&rsquo;t be deleted.
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
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
		</li>
	);
}
