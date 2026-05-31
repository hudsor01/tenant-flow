"use client";

import type { SortingState } from "@tanstack/react-table";
import { Bookmark, Save, Trash2 } from "lucide-react";
import {
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";
import { Input } from "#components/ui/input";
import { getSortingStateParser } from "#lib/parsers";
import {
	type DashboardViewSnapshot,
	useDashboardPresetsStore,
} from "#stores/dashboard-presets-store";

// The SAME nuqs keys `useClientDataTable` writes (D-4). The search filter lives
// under the pinned `property` column key (W-3) — there is NO separate search/q
// key. `status` is the faceted multi-select (string[]); `property` is the search
// string. `,` is the array separator `useClientDataTable` uses for faceted keys.
const ARRAY_SEPARATOR = ",";
const PORTFOLIO_COLUMN_IDS = portfolioColumns
	.map((column) => column.id)
	.filter((id): id is string => Boolean(id));

// Parser element type the sort nuqs key serializes (ExtendedColumnSort<PortfolioRow>[]).
type PortfolioSort = ReturnType<
	ReturnType<typeof getSortingStateParser<PortfolioRow>>["parseServerSide"]
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
	status: parseAsArrayOf(parseAsString, ARRAY_SEPARATOR),
	property: parseAsString,
};

// The sort parser narrows `id` to the column-id set, so its setter expects
// `ExtendedColumnSort<PortfolioRow>[]`. The stored snapshot's `sort` is the plain
// TanStack `SortingState` (`id: string`); this single narrowing cast mirrors the
// boundary cast `useClientDataTable` already performs on its own sort setter.
function toPortfolioSort(sort: SortingState): PortfolioSort {
	return sort as PortfolioSort;
}

/**
 * Save / apply / delete saved portfolio view presets (DT-08).
 *
 * The URL is the source of truth for filter/sort/page (resolves the
 * nuqs↔Zustand ordering risk): the snapshot READS live values from nuqs and the
 * presets-store column visibility; applying writes the snapshot BACK to the same
 * nuqs keys + `setColumnVisibility`. The store itself never touches the URL —
 * this component owns the nuqs read/write on both paths.
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

	const presets = listPresets();

	function collectSnapshot(): DashboardViewSnapshot {
		const filters: Record<string, string | string[]> = {};
		if (urlState.status && urlState.status.length > 0) {
			filters.status = urlState.status;
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
	}

	function handleApply(presetName: string) {
		const preset = applyPreset(presetName);
		if (!preset) return;
		const status = preset.filters.status;
		const property = preset.filters.property;
		void setUrlState({
			page: preset.page,
			sort: toPortfolioSort(preset.sort),
			status: Array.isArray(status) ? status : status ? [status] : null,
			property: typeof property === "string" ? property : null,
		});
		setColumnVisibility(preset.columnVisibility);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="gap-2">
					<Bookmark aria-hidden="true" className="size-4" />
					Presets
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<DropdownMenuLabel>Save current view</DropdownMenuLabel>
				<div className="flex items-center gap-2 px-2 py-1.5">
					<Input
						inputSize="sm"
						aria-label="Preset name"
						placeholder="Preset name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								handleSave();
							}
						}}
					/>
					<Button
						type="button"
						size="sm"
						aria-label="Save preset"
						disabled={!name.trim()}
						onClick={handleSave}
					>
						<Save aria-hidden="true" className="size-4" />
					</Button>
				</div>

				{presets.length > 0 && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>Saved presets</DropdownMenuLabel>
						{presets.map((preset) => (
							<DropdownMenuItem
								key={preset.name}
								onSelect={() => handleApply(preset.name)}
								className="justify-between gap-2"
							>
								<span className="truncate">{preset.name}</span>
								<button
									type="button"
									aria-label={`Delete preset ${preset.name}`}
									className="text-muted-foreground hover:text-destructive"
									onClick={(event) => {
										event.preventDefault();
										event.stopPropagation();
										deletePreset(preset.name);
									}}
								>
									<Trash2 aria-hidden="true" className="size-4" />
								</button>
							</DropdownMenuItem>
						))}
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
