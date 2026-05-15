"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#components/ui/dialog";
import { Input } from "#components/ui/input";
import type {
	DocumentCategoryRow,
	UpdateDocumentCategoryInput,
} from "#hooks/api/query-keys/document-category-keys";

const LABEL_MAX = 80;

interface CategoryRenameDialogProps {
	target: DocumentCategoryRow | null;
	onOpenChange: (open: boolean) => void;
	onSubmit: (input: UpdateDocumentCategoryInput) => void;
	isPending: boolean;
}

export function CategoryRenameDialog({
	target,
	onOpenChange,
	onSubmit,
	isPending,
}: CategoryRenameDialogProps) {
	const [label, setLabel] = useState("");

	useEffect(() => {
		setLabel(target?.label ?? "");
	}, [target]);

	const trimmedLabel = label.trim();
	// Cycle-1 M-2: trim BOTH sides — the DB CHECK only enforces
	// length(trim(label)), so a stored label could include incidental
	// whitespace. Comparing trimmed-vs-untrimmed would falsely enable
	// Save on a no-op rename.
	const trimmedExisting = target?.label.trim() ?? "";
	const canSubmit =
		!isPending && trimmedLabel.length > 0 && trimmedLabel !== trimmedExisting;

	return (
		<Dialog open={target !== null} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Rename category</DialogTitle>
					<DialogDescription>
						Slug stays as <code>{target?.slug}</code>. Labels can be edited
						freely.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-1">
					<label htmlFor="rename-label" className="text-sm font-medium">
						Label
					</label>
					<Input
						id="rename-label"
						value={label}
						maxLength={LABEL_MAX}
						onChange={(e) => setLabel(e.target.value)}
						autoFocus
					/>
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={() => {
							if (!target) return;
							onSubmit({ id: target.id, label: trimmedLabel });
						}}
						disabled={!canSubmit}
					>
						{isPending && (
							<Loader2
								className="size-4 mr-2 animate-spin"
								aria-hidden="true"
							/>
						)}
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
