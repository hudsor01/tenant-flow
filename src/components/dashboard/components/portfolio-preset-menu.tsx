"use client";

"use no memo";

import type { ColumnSort, SortingState } from "@tanstack/react-table";
import { Bookmark, Save, Trash2 } from "lucide-react";
import {
	type inferParserType,
	parseAsArrayOf,
	parseAsInteger,
	parseAsString,
	useQueryStates,
} from "nuqs";
import { useState } from "react";

import { portfolioColumns } from "#components/dashboard/components/portfolio-columns";
import type { PortfolioRow } from "#components/dashboard/dashboard-types";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import { getSortingStateParser } from "#lib/parsers";
import {
	type DashboardViewSnapshot,
	useDashboardPresetsStore,
} from "#stores/dashboard-presets-store";

// The SAME nuqs keys `useClientDataTable` writes (D-4). The search filter lives
// under the pinned `property` column key (W-3) — there is NO separate search/q
// key. `occupancy` is the faceted multi-select (string[]); `property` is the search
// string. `,` is the array separator `useClientDataTable` uses for faceted keys.
const ARRAY_SEPARATOR = ",";
const PORTFOLIO_COLUMN_IDS = portfolioColumns
	.map((column) => column.id)
	.filter((id): id is string => Boolean(id));
const PORTFOLIO_COLUMN_ID_SET: ReadonlySet<string> = new Set(
	PORTFOLIO_COLUMN_IDS,
);

// Parser element type the sort nuqs key serializes (ExtendedColumnSort<PortfolioRow>[]).
type PortfolioSort = inferParserType<
	ReturnType<typeof getSortingStateParser<PortfolioRow>>
>;

/**
 * nuqs parser bundle shared by the snapshot collect + apply paths. Identical
 * parsers to `useClientDataTable` so the URL round-trips byte-for-byte: a tampered
 * persisted preset degrades to the parser default rather than crashing (T-05-03b-01).
 */
const urlStateParsers = {
	page: parseAsInteger.withDefault(1),
	sort: getSortingStateParser<PortfolioRow>(PORTFOLIO_COLUMN_IDS).withDefault(
		[],
	),
	occupancy: parseAsArrayOf(parseAsString, ARRAY_SEPARATOR),
	property: parseAsString,
};

/** A stored sort entry on a column the table has, as the sort parser admits. */
function isPortfolioSortEntry(
	entry: ColumnSort,
): entry is NonNullable<PortfolioSort>[number] {
	return PORTFOLIO_COLUMN_ID_SET.has(entry.id);
}

// The stored snapshot's `sort` is the plain TanStack `SortingState` (`id:
// string`), and nuqs hands a written value to the table without the parser's
// id check, so a preset sorted by a column that is gone (the old Lease Status,
// `status`) would reach the table, which drops it with a dev warning and
// renders unsorted, while the bad `sort` stays in the URL. Keep only the
// entries the parser would accept: a column id the table has.
function toPortfolioSort(sort: SortingState): PortfolioSort {
	return sort.filter(isPortfolioSortEntry);
}

/**
 * Save / apply / delete saved portfolio view presets (DT-08).
 *
 * The URL is the source of truth for filter/sort/page (resolves the
 * nuqs↔Zustand ordering risk): the snapshot READS live values from nuqs and the
 * presets-store column visibility; applying writes the snapshot BACK to the same
 * nuqs keys + `setColumnVisibility`. The store itself never touches the URL —
 * this component owns the nuqs read/write on both paths.
 *
 * The name field lives in a dialog the menu's "Save current view…" item opens:
 * a menu holds only menu items, and the field and its save button inside it
 * failed axe's `aria-required-children` on the open menu (66.2-39 fix round 4,
 * Part 8h).
 */
export function PortfolioPresetMenu() {
	const { listPresets, savePreset, applyPreset, deletePreset } =
		useDashboardPresetsStore();
	const columnVisibility = useDashboardPresetsStore(
		(state) => state.columnVisibility,
	);
	const setColumnVisibility = useDashboardPresetsStore(
		(state) => state.setColumnVisibility,
	);
	const [urlState, setUrlState] = useQueryStates(urlStateParsers);
	const [name, setName] = useState("");
	const [saveOpen, setSaveOpen] = useState(false);

	const presets = listPresets();

	function collectSnapshot(): DashboardViewSnapshot {
		const filters: Record<string, string | string[]> = {};
		if (urlState.occupancy && urlState.occupancy.length > 0) {
			filters.occupancy = urlState.occupancy;
		}
		if (urlState.property) {
			filters.property = urlState.property;
		}
		return {
			filters,
			sort: urlState.sort,
			columnVisibility,
			page: urlState.page,
		};
	}

	function handleSave() {
		const trimmed = name.trim();
		if (!trimmed) return;
		savePreset(trimmed, collectSnapshot());
		setName("");
		setSaveOpen(false);
	}

	function handleApply(presetName: string) {
		const preset = applyPreset(presetName);
		if (!preset) return;
		// A preset saved before the column was Occupancy carries a `status`
		// filter (the invented lease status, whose values no row has): not
		// applied; a sort by that column goes in toPortfolioSort.
		const occupancy = preset.filters.occupancy;
		const property = preset.filters.property;
		void setUrlState({
			page: preset.page,
			sort: toPortfolioSort(preset.sort),
			occupancy: Array.isArray(occupancy)
				? occupancy
				: occupancy
					? [occupancy]
					: null,
			property: typeof property === "string" ? property : null,
		});
		setColumnVisibility(preset.columnVisibility);
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" className="gap-2">
						<Bookmark aria-hidden="true" className="size-4" />
						Presets
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-64">
					<DropdownMenuItem onSelect={() => setSaveOpen(true)}>
						<Save aria-hidden="true" className="size-4" />
						Save current view…
					</DropdownMenuItem>

					{presets.length > 0 && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuLabel>Saved presets</DropdownMenuLabel>
							{presets.map((preset) => (
								// Apply and delete are two menu items in one row, so the arrow
								// keys reach both (a button inside the item was mouse-only).
								<div key={preset.name} className="flex items-center">
									<DropdownMenuItem
										onSelect={() => handleApply(preset.name)}
										className="min-w-0 flex-1"
									>
										<span className="truncate">{preset.name}</span>
									</DropdownMenuItem>
									<DropdownMenuItem
										aria-label={`Delete preset ${preset.name}`}
										onSelect={(event) => {
											// Keep the menu open, as the inline delete did.
											event.preventDefault();
											deletePreset(preset.name);
										}}
										className="shrink-0"
									>
										<Trash2 aria-hidden="true" className="size-4" />
									</DropdownMenuItem>
								</div>
							))}
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			<Dialog
				open={saveOpen}
				onOpenChange={(open) => {
					setSaveOpen(open);
					if (!open) setName("");
				}}
			>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Save current view</DialogTitle>
						<DialogDescription className="mb-0">
							Saves the table's filters, sort, page and visible columns under a
							name you can apply again from Presets.
						</DialogDescription>
					</DialogHeader>
					<form
						id="save-preset-form"
						className="space-y-2"
						onSubmit={(event) => {
							event.preventDefault();
							handleSave();
						}}
					>
						<Label htmlFor="preset-name">Preset name</Label>
						<Input
							id="preset-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							autoFocus
						/>
					</form>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setSaveOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							form="save-preset-form"
							disabled={!name.trim()}
						>
							Save preset
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
