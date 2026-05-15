"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "#components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import type {
	DeleteWithReassignInput,
	DocumentCategoryRow,
} from "#hooks/api/query-keys/document-category-keys";

interface CategoryDeleteDialogProps {
	target: DocumentCategoryRow | null;
	candidates: DocumentCategoryRow[];
	onOpenChange: (open: boolean) => void;
	onSubmit: (input: DeleteWithReassignInput) => void;
	isPending: boolean;
}

export function CategoryDeleteDialog({
	target,
	candidates,
	onOpenChange,
	onSubmit,
	isPending,
}: CategoryDeleteDialogProps) {
	const [reassignTo, setReassignTo] = useState("");

	// Default to the canonical 'other' fallback when the dialog opens
	// against a NEW target. Re-run only on `target?.id` change — gating
	// on the full `candidates` array would clobber the user's chosen
	// reassign target if the categories list refetches mid-dialog
	// (e.g., refetchOnWindowFocus). The ref pattern lets the effect read
	// the latest `candidates` without being a re-run trigger.
	const candidatesRef = useRef(candidates);
	candidatesRef.current = candidates;

	const targetId = target?.id;
	useEffect(() => {
		if (!targetId) {
			setReassignTo("");
			return;
		}
		const latest = candidatesRef.current;
		const fallback =
			latest.find((c) => c.slug === "other" && c.id !== targetId) ??
			latest.find((c) => c.id !== targetId);
		setReassignTo(fallback?.id ?? "");
	}, [targetId]);

	const canSubmit =
		!isPending && !!target && !!reassignTo && reassignTo !== target.id;

	return (
		<Dialog open={target !== null} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete &ldquo;{target?.label}&rdquo;</DialogTitle>
					<DialogDescription>
						Documents currently tagged with this category will be reassigned to
						the category you pick below. This change is atomic — every affected
						document is updated in a single transaction.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-1">
					<label htmlFor="reassign-target" className="text-sm font-medium">
						Reassign documents to
					</label>
					<Select value={reassignTo} onValueChange={setReassignTo}>
						<SelectTrigger
							id="reassign-target"
							aria-label="Reassignment target category"
						>
							<SelectValue placeholder="Choose a category" />
						</SelectTrigger>
						<SelectContent>
							{candidates
								.filter((c) => c.id !== target?.id)
								.map((c) => (
									<SelectItem key={c.id} value={c.id}>
										{c.label}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={() => {
							if (!target || !reassignTo) return;
							onSubmit({ from_id: target.id, to_id: reassignTo });
						}}
						disabled={!canSubmit}
					>
						{isPending && (
							<Loader2
								className="size-4 mr-2 animate-spin"
								aria-hidden="true"
							/>
						)}
						Delete &amp; reassign
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
