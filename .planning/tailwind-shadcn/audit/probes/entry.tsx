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
//   border-beam-grid, border-beam-reduced-motion, blur-fade-no-js, blur-fade-reduced-motion,
//   blur-fade-io-stub, update-password-badge, data-table, card-action, button-group-nested,
//   plain-popover, sheet, sheet-no-close, sheet-slot-override, button, toast-default,
//   toast-success, toast-error, toast-loading
// card-action (ledger C6) mounts Card > CardHeader (title, description, CardAction holding a small
// Button) + CardContent + CardFooter in a 600px wrapper; button-group-nested (ledger C13) mounts an
// outer ButtonGroup holding two ButtonGroups of two outline Buttons. Both pass `data-probe` through
// each component's props spread, so the selectors work with or without upstream data-slots.
// Runtime props: border-beam-* receive { size, duration, colorFrom, colorTo } parsed from the first
// <BorderBeam block of tenant-stats.tsx / tenant-grid.tsx; update-password-badge receives the
// className literal read from update-password-form.tsx. Neither string is in this file, so the
// probe-dir scan never adds it to the CSS build.
// plain-popover (66.2-21) mounts the date-popover Popover tree with a background-less size-24 div in
// place of the Calendar: the reference surface for the date-popover corner patch (C7). sheet,
// sheet-no-close and sheet-slot-override (66.2-21, H10) mount an open left SheetContent holding
// SheetHeader (SheetTitle, SheetDescription) and a SheetFooter with a plain button; the last two add
// showCloseButton={false} and data-slot="sidebar" to SheetContent through a props spread, so the
// scenario renders on a Sheet that does not know either prop yet.
// button (66.2-22, D-29) mounts, in tab order: one Button per variant (data-probe v-<variant>,
// labelled with the variant name), sizes sm and lg (s-sm, s-lg), an icon Button (s-icon, aria-label
// "Probe icon"), an outline Button with aria-invalid (invalid), an asChild Button around a link
// (aschild, inside the aschild-wrap span) and a default Button holding three Plus icons: unsized
// (i-unsized), size-5 (i-size5) and h-5 w-5 (i-hw5). Four reference divs (ref-border, ref-input,
// ref-destructive, ref-ring) carry border plus border-border, border-input, border-destructive and
// border-ring, so the runner compares the Button borders with the tokens' own rendered colors.
// toast-default, toast-success, toast-error and toast-loading (66.2-26, A2, VD-24, VD-25) mount the
// real Toaster with position="top-right" richColors closeButton (as src/app/layout.tsx does) inside a
// next-themes ThemeProvider (attribute="class", enableSystem={false}, storageKey="tf-probe-theme",
// defaultTheme read from the <html> theme class), then raise one toast of that kind with an infinite
// duration after mount. The runner measures; this file only renders.
// BlurFade uses the KPI props { delay: 6, duration: 500 } (66.2-27, D-30): the capped 480 ms delay
// and the 500 ms slow duration, the longest entrance at any call site.
//
// Stubs (mapped by the resolver in component-probes.mjs):
//   #lib/supabase/client  -> probes/stubs/supabase-client.ts
//   #lib/frontend-logger  -> probes/stubs/frontend-logger.ts
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { ThemeProvider } from "next-themes";
import { type ReactElement, useEffect } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

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
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "#components/ui/sheet";
import { Toaster } from "#components/ui/sonner";

type Props = Record<string, unknown>;
const BUTTON_VARIANTS = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;
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
	<BlurFade delay={6} duration={500}>
		<p>Probe content</p>
	</BlurFade>
);

const beam = (p: Props) => (
	<div className="relative h-[150px] w-[300px] rounded-xl border">
		<BorderBeam size={p.size as number | undefined} duration={p.duration as number | undefined} colorFrom={p.colorFrom as string | undefined} colorTo={p.colorTo as string | undefined} />
	</div>
);

const sheetTree = (contentProps: Props) => (
	<Sheet open>
		<SheetContent side="left" {...contentProps}>
			<SheetHeader>
				<SheetTitle>Probe sheet</SheetTitle>
				<SheetDescription>Probe description</SheetDescription>
			</SheetHeader>
			<SheetFooter>
				<button type="button">Done</button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
);

type ToastKind = "default" | "success" | "error" | "loading";
const TOAST_FIRE: Record<ToastKind, () => void> = {
	default: () => toast("Probe neutral", { duration: Number.POSITIVE_INFINITY }),
	success: () => toast.success("Probe success", { duration: Number.POSITIVE_INFINITY }),
	error: () => toast.error("Probe error", { duration: Number.POSITIVE_INFINITY }),
	loading: () => toast.loading("Probe loading", { duration: Number.POSITIVE_INFINITY }),
};

function ToastFire({ kind }: { kind: ToastKind }) {
	useEffect(() => {
		const id = setTimeout(TOAST_FIRE[kind], 50);
		return () => clearTimeout(id);
	}, [kind]);
	return null;
}

const toastTree = (kind: ToastKind) => () => (
	<ThemeProvider
		attribute="class"
		enableSystem={false}
		storageKey="tf-probe-theme"
		defaultTheme={document.documentElement.classList.contains("dark") ? "dark" : "light"}
	>
		<Toaster position="top-right" richColors closeButton />
		<ToastFire kind={kind} />
	</ThemeProvider>
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
	"plain-popover": () => (
		<div className="p-8">
			<Popover open>
				<PopoverTrigger>Pick a date</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<div className="size-24" />
				</PopoverContent>
			</Popover>
		</div>
	),
	sheet: () => sheetTree({}),
	"sheet-no-close": () => sheetTree({ showCloseButton: false }),
	"sheet-slot-override": () => sheetTree({ "data-slot": "sidebar" }),
	"grid-pattern": () => (
		<div className="relative h-[300px] w-[400px]">
			<GridPattern />
		</div>
	),
	"border-beam-stats": beam,
	"border-beam-grid": beam,
	"border-beam-reduced-motion": beam,
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
	button: () => (
		<div className="flex flex-wrap items-start gap-4 p-8" data-probe="button-root">
			{BUTTON_VARIANTS.map((v) => (
				<Button key={v} variant={v} data-probe={`v-${v}`}>
					{v}
				</Button>
			))}
			<Button size="sm" data-probe="s-sm">
				Small
			</Button>
			<Button size="lg" data-probe="s-lg">
				Large
			</Button>
			<Button size="icon" aria-label="Probe icon" data-probe="s-icon">
				<Plus />
			</Button>
			<Button variant="outline" aria-invalid="true" data-probe="invalid">
				Invalid
			</Button>
			<span data-probe="aschild-wrap">
				<Button asChild data-probe="aschild">
					<a href="/probe">Link</a>
				</Button>
			</span>
			<Button data-probe="icons">
				<Plus data-probe="i-unsized" />
				<Plus className="size-5" data-probe="i-size5" />
				<Plus className="h-5 w-5" data-probe="i-hw5" />
			</Button>
			<div className="size-8 border border-border" data-probe="ref-border" />
			<div className="size-8 border border-input" data-probe="ref-input" />
			<div className="size-8 border border-destructive" data-probe="ref-destructive" />
			<div className="size-8 border border-ring" data-probe="ref-ring" />
		</div>
	),
	"toast-default": toastTree("default"),
	"toast-success": toastTree("success"),
	"toast-error": toastTree("error"),
	"toast-loading": toastTree("loading"),
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
