// Probe scenarios for component-probes.mjs: each mounts the REAL repo components (bundled with
// the repo's rolldown, styled by the real compiled globals.css). Read-only tooling; never imported
// by the app. Bundled by `node .planning/tailwind-shadcn/audit/component-probes.mjs <label>`.
//
// Exposes window.__tfProbes = { ids, render(id, props?), ssr(id, props?), hydrate(id, props?) }:
//   render   createRoot into #root (unmounting the previous probe), resolves after a frame
//   ssr      react-dom/server renderToString of the scenario
//   hydrate  writes the SSR HTML into #root, then hydrateRoot
//
// Scenario ids (component-probes.mjs and later plans read these verbatim):
//   otp-setup, otp-mfa, chart, command, date-popover, grid-pattern, border-beam-stats,
//   border-beam-grid, blur-fade-no-js, blur-fade-reduced-motion, blur-fade-io-stub,
//   update-password-badge, data-table, card-action, button-group-nested
// card-action (ledger C6) mounts Card > CardHeader (title, description, CardAction holding a small
// Button) + CardContent + CardFooter in a 600px wrapper; button-group-nested (ledger C13) mounts an
// outer ButtonGroup holding two ButtonGroups of two outline Buttons. Both pass `data-probe` through
// each component's props spread, so the selectors work with or without upstream data-slots.
// Runtime props: border-beam-* receive { size, duration, colorFrom, colorTo } parsed from the first
// <BorderBeam block of tenant-stats.tsx / tenant-grid.tsx; update-password-badge receives the
// className literal read from update-password-form.tsx. Neither string is in this file, so the
// probe-dir scan never adds it to the CSS build.
// BlurFade uses today's KPI props { inView: true, delay: 6, duration: 500 }; plan 66.2-27 updates
// them when it removes `inView`.
//
// Stubs (mapped by the resolver in component-probes.mjs):
//   #lib/supabase/client  -> probes/stubs/supabase-client.ts
//   #lib/frontend-logger  -> probes/stubs/frontend-logger.ts
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Search } from "lucide-react";
import type { ReactElement } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { MfaVerificationDialog } from "#components/auth/mfa-verification-dialog";
import { VerifyStep } from "#components/auth/two-factor-setup-steps";
import { DataTable } from "#components/data-table/data-table";
import { BlurFade } from "#components/ui/blur-fade";
import { BorderBeam } from "#components/ui/border-beam";
import { Button } from "#components/ui/button";
import { ButtonGroup } from "#components/ui/button-group";
import { Calendar } from "#components/ui/calendar";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { type ChartConfig, ChartContainer } from "#components/ui/chart";
import { ChartTooltip, ChartTooltipContent } from "#components/ui/chart-tooltip";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "#components/ui/command";
import { Dialog, DialogContent } from "#components/ui/dialog";
import { GridPattern } from "#components/ui/grid-pattern";
import { Popover, PopoverContent, PopoverTrigger } from "#components/ui/popover";

type Props = Record<string, unknown>;
const noop = () => {};

const chartConfig = { revenue: { label: "Revenue", color: "var(--color-chart-1)" } } satisfies ChartConfig;
const chartData = [
	{ month: "Jan", revenue: 1200 },
	{ month: "Feb", revenue: 1800 },
	{ month: "Mar", revenue: 1500 },
	{ month: "Apr", revenue: 2200 },
	{ month: "May", revenue: 2000 },
	{ month: "Jun", revenue: 2600 },
];

type TableRowData = { name: string; unit: string };
const tableData: TableRowData[] = [
	{ name: "Probe A", unit: "1A" },
	{ name: "Probe B", unit: "2B" },
	{ name: "Probe C", unit: "3C" },
];
const tableColumns = [
	{ accessorKey: "name", header: "Name" },
	{ accessorKey: "unit", header: "Unit" },
];

function DataTableProbe() {
	const table = useReactTable<TableRowData>({
		data: tableData,
		columns: tableColumns,
		getCoreRowModel: getCoreRowModel(),
		enableRowSelection: true,
		state: { rowSelection: { "1": true } },
	});
	return <DataTable table={table} />;
}

const blurFade = () => (
	<BlurFade inView delay={6} duration={500}>
		<p>Probe content</p>
	</BlurFade>
);

const beam = (p: Props) => (
	<div className="relative h-[150px] w-[300px] rounded-xl border">
		<BorderBeam size={p.size as number | undefined} duration={p.duration as number | undefined} colorFrom={p.colorFrom as string | undefined} colorTo={p.colorTo as string | undefined} />
	</div>
);

const scenarios: Record<string, (p: Props) => ReactElement> = {
	"otp-setup": () => (
		<Dialog open>
			<DialogContent className="sm:max-w-[480px]" intent="edit">
				<VerifyStep verifyCode="123" onVerifyCodeChange={noop} verifyPending={false} verifyError={null} onVerify={noop} onBack={noop} />
			</DialogContent>
		</Dialog>
	),
	"otp-mfa": () => <MfaVerificationDialog open onOpenChange={noop} factorId="probe-factor" onSuccess={noop} onCancel={noop} />,
	chart: () => (
		<div className="w-[800px] p-4">
			<ChartContainer config={chartConfig} className="h-[300px] w-full">
				<AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
					<CartesianGrid vertical={false} />
					<XAxis dataKey="month" />
					<YAxis />
					<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
					<Area dataKey="revenue" type="monotone" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.2} />
				</AreaChart>
			</ChartContainer>
		</div>
	),
	command: () => (
		<CommandDialog open className="max-w-xl">
			<CommandInput placeholder="Search pages and actions..." />
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>
				<CommandGroup heading="Pages">
					<CommandItem>
						<Search />
						Dashboard
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	),
	"date-popover": () => (
		<div className="p-8">
			<Popover open>
				<PopoverTrigger>Pick a date</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar mode="single" />
				</PopoverContent>
			</Popover>
		</div>
	),
	"grid-pattern": () => (
		<div className="relative h-[300px] w-[400px]">
			<GridPattern />
		</div>
	),
	"border-beam-stats": beam,
	"border-beam-grid": beam,
	"blur-fade-no-js": blurFade,
	"blur-fade-reduced-motion": blurFade,
	"blur-fade-io-stub": blurFade,
	"update-password-badge": (p) => (
		<div className={String(p.className ?? "")}>
			<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" />
		</div>
	),
	"data-table": () => (
		<div className="w-[800px] p-4">
			<DataTableProbe />
		</div>
	),
	"card-action": () => (
		<div className="w-[600px]">
			<Card>
				<CardHeader data-probe="header">
					<CardTitle>Probe title</CardTitle>
					<CardDescription>Probe description</CardDescription>
					<CardAction data-probe="action">
						<Button size="sm">Act</Button>
					</CardAction>
				</CardHeader>
				<CardContent>Body</CardContent>
				<CardFooter>Foot</CardFooter>
			</Card>
		</div>
	),
	"button-group-nested": () => (
		<div className="p-4">
			<ButtonGroup data-probe="outer">
				<ButtonGroup data-probe="inner-1">
					<Button variant="outline">One</Button>
					<Button variant="outline">Two</Button>
				</ButtonGroup>
				<ButtonGroup data-probe="inner-2">
					<Button variant="outline">Three</Button>
					<Button variant="outline">Four</Button>
				</ButtonGroup>
			</ButtonGroup>
		</div>
	),
};

const element = (id: string, props: Props = {}) => {
	const make = scenarios[id];
	if (!make) throw new Error(`unknown probe ${id}`);
	return make(props);
};
const container = () => {
	const el = document.getElementById("root");
	if (!el) throw new Error("#root missing");
	return el;
};
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 50)));
let current: Root | null = null;
const unmount = () => {
	current?.unmount();
	current = null;
};

declare global {
	interface Window {
		__tfProbes: {
			ids: string[];
			render(id: string, props?: Props): Promise<void>;
			ssr(id: string, props?: Props): string;
			hydrate(id: string, props?: Props): Promise<void>;
		};
	}
}

window.__tfProbes = {
	ids: Object.keys(scenarios),
	async render(id, props) {
		unmount();
		current = createRoot(container());
		current.render(element(id, props));
		await frame();
	},
	ssr(id, props) {
		return renderToString(element(id, props));
	},
	async hydrate(id, props) {
		unmount();
		const root = container();
		root.innerHTML = renderToString(element(id, props));
		current = hydrateRoot(root, element(id, props));
		await frame();
	},
};
