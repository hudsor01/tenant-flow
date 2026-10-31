"use client";

/**
 * The shadcn Sidebar primitive and its provider, vendored BY HAND as one file.
 *
 * SOURCE. Registry item https://ui.shadcn.com/r/styles/new-york-v4/sidebar.json,
 * fetched 2026-10-31 (last-modified Sat, 31 Oct 2026 20:49:13 GMT). The sha256
 * of its files[0].content is
 * 2ba1a9b9422f4172373f4cd0587b675d2331a41f4fa68f65dab2b23ca98fd9d2.
 *
 * WHY BY HAND (D-45). `shadcn add sidebar` would also write the registry's
 * sheet, button, tooltip, input, skeleton and use-mobile files over the local
 * customized copies, and merge the item's zinc cssVars into globals.css. Only
 * this file is taken; it composes the local primitives. `cn` comes from
 * `#lib/utils` (D-04).
 *
 * NOT A BARREL FILE. Every export is declared here (rule 2).
 *
 * DIVERGENCES FROM UPSTREAM (each is also an entry in the divergence register).
 *   V1  Imports use `#` subpaths; the React hooks and the ComponentProps type are
 *       imported by name instead of a namespace import; Biome formatting.
 *   V2  No SIDEBAR_WIDTH constants and no static style objects (rule 5). The
 *       widths are the `--sidebar-width` (14rem), `--sidebar-width-mobile`
 *       (18rem) and `--sidebar-width-icon` (3rem) tokens declared in the
 *       globals.css `:root` block; the mobile sheet sizes itself with
 *       `w-(--sidebar-width-mobile)`. SidebarProvider no longer destructures
 *       `style`, so a caller's style still reaches the wrapper through props.
 *   V3  The mode switch is the `lg` breakpoint (D-33): `lg:block` and `lg:flex`
 *       replace the upstream `md:` pair, and useIsMobile from
 *       `#hooks/use-mobile` matches `(width < 64rem)`, the same boundary.
 *   V4  Base-rule neutralizers (D-49): SidebarMenu and SidebarMenuSub cancel the
 *       globals.css list base rules on the list itself, and the two menu
 *       buttons add `no-underline` (details under D-49 below).
 *   V5  SidebarSeparator passes `data-[orientation=horizontal]:w-auto` so
 *       tailwind-merge drops the Separator's variant-scoped `w-full`, which a
 *       bare `w-auto` cannot override (S11: a 16px overflow).
 *   V6  Accessible names: the sheet is titled "Navigation menu" and described
 *       "Main navigation for your TenantFlow account"; the trigger and the rail
 *       are named "Toggle navigation menu" (the rail also as its title).
 *   V7  SidebarTrigger sets `aria-expanded` from `openMobile` on mobile and
 *       `open` on desktop, renders a `size-5` PanelLeft icon and drops the
 *       sr-only label text in favor of its aria-label.
 *   V8  The Cmd/Ctrl+B handler compares `event.key.toLowerCase()` (D-52 guard
 *       list below).
 *   V9  Each desktop toggle persists through `persistSidebarOpen` from
 *       `#lib/sidebar-state` (D-36), which owns the cookie name, max-age,
 *       SameSite and the https Secure flag. This file never touches
 *       `document.cookie`; the cookie constants are imported, never redeclared
 *       (rule 3).
 *   V10 No manual memoization; the React Compiler memoizes `setOpen`,
 *       `toggleSidebar` and the context value. The keydown listener calls
 *       `toggleSidebar` through `useEffectEvent`, so the effect runs once
 *       (empty dependency array) and always calls the current toggle.
 *   V11 The mobile sheet shortens the sheet's open and close transitions to
 *       `data-[state=open]:duration-200` and `data-[state=closed]:duration-200`
 *       with `ease-out`.
 *   V12 Trimmed to the parts the owner shell composes. Left out: SidebarInset
 *       (it renders a second main landmark, D-35), SidebarInput,
 *       SidebarGroupLabel, SidebarGroupAction, SidebarGroupContent,
 *       SidebarMenuAction, SidebarMenuBadge and SidebarMenuSkeleton, with the
 *       Input and Skeleton imports they needed.
 *
 * PHASE ADDITIONS.
 *   D-34 When the desktop sidebar is collapsed, SidebarHeader, SidebarContent
 *        and SidebarFooter carry `inert`, so off-canvas links are neither
 *        tabbable nor exposed to assistive tech. The container is NOT inert:
 *        SidebarRail is composed as its child, and the rail click is what
 *        expands the collapsed sidebar again (UI-SPEC S-5). Nothing is inert in
 *        the mobile sheet.
 *   D-46 The mobile SheetContent keeps the upstream `[&>button]:hidden`, so the
 *        sheet's own corner close button (a direct child button of the dialog)
 *        never shows. The visible, labelled 44px close control is the
 *        "Close navigation menu" button the owner shell renders in
 *        SidebarHeader (UI-SPEC S-4).
 *   D-49 SidebarMenu adds `mt-0 mb-0 pl-0 [&>li]:mb-0` and SidebarMenuSub adds
 *        `mt-0 mb-0 [&>li]:mb-0` against the unscoped `ul, ol` and `li` base
 *        rules; the menu items stay upstream, so the list's child variant is the
 *        single mechanism. The jsdom cascade harness reads only physical
 *        `pl-0`/`mt-0`/`mb-0`, so SidebarMenuSub's upstream logical `px-2.5` is
 *        proved by the call site and the browser suite instead. The menu
 *        buttons add `no-underline` against the anchor base rule.
 *   D-52 The shortcut acts only for Meta or Ctrl plus `b`. It returns without
 *        preventDefault when Shift or Alt is held, on key repeat, when the
 *        target sits inside an input, textarea, select or a contenteditable
 *        region that is not `contenteditable="false"`, and while any open
 *        dialog or alertdialog other than the nav sheet (`data-slot="sidebar"`)
 *        is in the document.
 */

import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";
import { Slot } from "radix-ui";
import {
	type ComponentProps,
	createContext,
	useContext,
	useEffect,
	useEffectEvent,
	useState,
} from "react";

import { Button } from "#components/ui/button";
import { Separator } from "#components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "#components/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "#components/ui/tooltip";
import { useIsMobile } from "#hooks/use-mobile";
import { persistSidebarOpen } from "#lib/sidebar-state";
import { cn } from "#lib/utils";

const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
	state: "expanded" | "collapsed";
	open: boolean;
	setOpen: (open: boolean) => void;
	openMobile: boolean;
	setOpenMobile: (open: boolean) => void;
	isMobile: boolean;
	toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextProps | null>(null);

function useSidebar() {
	const context = useContext(SidebarContext);
	if (!context) {
		throw new Error("useSidebar must be used within a SidebarProvider.");
	}

	return context;
}

function isEditableTarget(target: EventTarget | null): boolean {
	return (
		target instanceof Element &&
		target.closest(
			'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
		) !== null
	);
}

function hasBlockingDialog(): boolean {
	return (
		document.querySelector(
			'[role="dialog"][data-state="open"]:not([data-slot="sidebar"]), [role="alertdialog"][data-state="open"]',
		) !== null
	);
}

function SidebarProvider({
	defaultOpen = true,
	open: openProp,
	onOpenChange: setOpenProp,
	className,
	children,
	...props
}: ComponentProps<"div"> & {
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const isMobile = useIsMobile();
	const [openMobile, setOpenMobile] = useState(false);

	// This is the internal state of the sidebar.
	// We use openProp and setOpenProp for control from outside the component.
	const [_open, _setOpen] = useState(defaultOpen);
	const open = openProp ?? _open;
	const setOpen = (value: boolean | ((value: boolean) => boolean)) => {
		const openState = typeof value === "function" ? value(open) : value;
		if (setOpenProp) {
			setOpenProp(openState);
		} else {
			_setOpen(openState);
		}

		// This sets the cookie to keep the sidebar state.
		persistSidebarOpen(openState);
	};

	// Helper to toggle the sidebar.
	const toggleSidebar = () => {
		return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
	};

	// Adds a keyboard shortcut to toggle the sidebar. The effect event reads the
	// current toggleSidebar, so the window listener is attached once.
	const onShortcut = useEffectEvent(() => {
		toggleSidebar();
	});

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.key.toLowerCase() !== SIDEBAR_KEYBOARD_SHORTCUT ||
				!(event.metaKey || event.ctrlKey)
			) {
				return;
			}
			if (
				event.shiftKey ||
				event.altKey ||
				event.repeat ||
				isEditableTarget(event.target) ||
				hasBlockingDialog()
			) {
				return;
			}
			event.preventDefault();
			onShortcut();
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	// We add a state so that we can do data-state="expanded" or "collapsed".
	// This makes it easier to style the sidebar with Tailwind classes.
	const state = open ? "expanded" : "collapsed";

	const contextValue: SidebarContextProps = {
		state,
		open,
		setOpen,
		isMobile,
		openMobile,
		setOpenMobile,
		toggleSidebar,
	};

	return (
		<SidebarContext.Provider value={contextValue}>
			<TooltipProvider delayDuration={0}>
				<div
					data-slot="sidebar-wrapper"
					className={cn(
						"group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
						className,
					)}
					{...props}
				>
					{children}
				</div>
			</TooltipProvider>
		</SidebarContext.Provider>
	);
}

function Sidebar({
	side = "left",
	variant = "sidebar",
	collapsible = "offcanvas",
	className,
	children,
	...props
}: ComponentProps<"div"> & {
	side?: "left" | "right";
	variant?: "sidebar" | "floating" | "inset";
	collapsible?: "offcanvas" | "icon" | "none";
}) {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

	if (collapsible === "none") {
		return (
			<div
				data-slot="sidebar"
				className={cn(
					"flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		);
	}

	if (isMobile) {
		return (
			<Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
				<SheetContent
					data-sidebar="sidebar"
					data-slot="sidebar"
					data-mobile="true"
					className="w-(--sidebar-width-mobile) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden data-[state=closed]:duration-200 data-[state=open]:duration-200 ease-out"
					side={side}
				>
					<SheetHeader className="sr-only">
						<SheetTitle>Navigation menu</SheetTitle>
						<SheetDescription>
							Main navigation for your TenantFlow account
						</SheetDescription>
					</SheetHeader>
					<div className="flex h-full w-full flex-col">{children}</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<div
			className="group peer hidden text-sidebar-foreground lg:block"
			data-state={state}
			data-collapsible={state === "collapsed" ? collapsible : ""}
			data-variant={variant}
			data-side={side}
			data-slot="sidebar"
		>
			{/* This is what handles the sidebar gap on desktop */}
			<div
				data-slot="sidebar-gap"
				className={cn(
					"relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
					"group-data-[collapsible=offcanvas]:w-0",
					"group-data-[side=right]:rotate-180",
					variant === "floating" || variant === "inset"
						? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
						: "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
				)}
			/>
			<div
				data-slot="sidebar-container"
				className={cn(
					"fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear lg:flex",
					side === "left"
						? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
						: "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
					// Adjust the padding for floating and inset variants.
					variant === "floating" || variant === "inset"
						? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
						: "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
					className,
				)}
				{...props}
			>
				<div
					data-sidebar="sidebar"
					data-slot="sidebar-inner"
					className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-sm"
				>
					{children}
				</div>
			</div>
		</div>
	);
}

function SidebarTrigger({
	className,
	onClick,
	...props
}: ComponentProps<typeof Button>) {
	const { toggleSidebar, isMobile, open, openMobile } = useSidebar();

	return (
		<Button
			data-sidebar="trigger"
			data-slot="sidebar-trigger"
			variant="ghost"
			size="icon"
			className={cn("size-7", className)}
			onClick={(event) => {
				onClick?.(event);
				toggleSidebar();
			}}
			aria-label="Toggle navigation menu"
			aria-expanded={isMobile ? openMobile : open}
			{...props}
		>
			<PanelLeftIcon className="size-5" />
		</Button>
	);
}

function SidebarRail({ className, ...props }: ComponentProps<"button">) {
	const { toggleSidebar } = useSidebar();

	return (
		<button
			data-sidebar="rail"
			data-slot="sidebar-rail"
			aria-label="Toggle navigation menu"
			tabIndex={-1}
			onClick={toggleSidebar}
			title="Toggle navigation menu"
			className={cn(
				"absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex",
				"in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
				"[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
				"group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar",
				"[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
				"[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
				className,
			)}
			{...props}
		/>
	);
}

function useCollapsedInert(): true | undefined {
	const { isMobile, state } = useSidebar();
	return (!isMobile && state === "collapsed") || undefined;
}

function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
	const collapsedInert = useCollapsedInert();

	return (
		<div
			data-slot="sidebar-header"
			data-sidebar="header"
			className={cn("flex flex-col gap-2 p-2", className)}
			inert={collapsedInert}
			{...props}
		/>
	);
}

function SidebarFooter({ className, ...props }: ComponentProps<"div">) {
	const collapsedInert = useCollapsedInert();

	return (
		<div
			data-slot="sidebar-footer"
			data-sidebar="footer"
			className={cn("flex flex-col gap-2 p-2", className)}
			inert={collapsedInert}
			{...props}
		/>
	);
}

function SidebarSeparator({
	className,
	...props
}: ComponentProps<typeof Separator>) {
	return (
		<Separator
			data-slot="sidebar-separator"
			data-sidebar="separator"
			className={cn(
				"mx-2 data-[orientation=horizontal]:w-auto bg-sidebar-border",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarContent({ className, ...props }: ComponentProps<"div">) {
	const collapsedInert = useCollapsedInert();

	return (
		<div
			data-slot="sidebar-content"
			data-sidebar="content"
			className={cn(
				"flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
				className,
			)}
			inert={collapsedInert}
			{...props}
		/>
	);
}

function SidebarGroup({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-group"
			data-sidebar="group"
			className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
			{...props}
		/>
	);
}

function SidebarMenu({ className, ...props }: ComponentProps<"ul">) {
	return (
		<ul
			data-slot="sidebar-menu"
			data-sidebar="menu"
			className={cn(
				"flex w-full min-w-0 flex-col gap-1 mt-0 mb-0 pl-0 [&>li]:mb-0",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarMenuItem({ className, ...props }: ComponentProps<"li">) {
	return (
		<li
			data-slot="sidebar-menu-item"
			data-sidebar="menu-item"
			className={cn("group/menu-item relative", className)}
			{...props}
		/>
	);
}

const sidebarMenuButtonVariants = cva(
	"peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 no-underline",
	{
		variants: {
			variant: {
				default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
				outline:
					"bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]",
			},
			size: {
				default: "h-8 text-sm",
				sm: "h-7 text-xs",
				lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function SidebarMenuButton({
	asChild = false,
	isActive = false,
	variant = "default",
	size = "default",
	tooltip,
	className,
	...props
}: ComponentProps<"button"> & {
	asChild?: boolean;
	isActive?: boolean;
	tooltip?: string | ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof sidebarMenuButtonVariants>) {
	const Comp = asChild ? Slot.Root : "button";
	const { isMobile, state } = useSidebar();

	const button = (
		<Comp
			data-slot="sidebar-menu-button"
			data-sidebar="menu-button"
			data-size={size}
			data-active={isActive}
			className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
			{...props}
		/>
	);

	if (!tooltip) {
		return button;
	}

	if (typeof tooltip === "string") {
		tooltip = {
			children: tooltip,
		};
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent
				side="right"
				align="center"
				hidden={state !== "collapsed" || isMobile}
				{...tooltip}
			/>
		</Tooltip>
	);
}

function SidebarMenuSub({ className, ...props }: ComponentProps<"ul">) {
	return (
		<ul
			data-slot="sidebar-menu-sub"
			data-sidebar="menu-sub"
			className={cn(
				"mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5 mt-0 mb-0 [&>li]:mb-0",
				"group-data-[collapsible=icon]:hidden",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarMenuSubItem({ className, ...props }: ComponentProps<"li">) {
	return (
		<li
			data-slot="sidebar-menu-sub-item"
			data-sidebar="menu-sub-item"
			className={cn("group/menu-sub-item relative", className)}
			{...props}
		/>
	);
}

function SidebarMenuSubButton({
	asChild = false,
	size = "md",
	isActive = false,
	className,
	...props
}: ComponentProps<"a"> & {
	asChild?: boolean;
	size?: "sm" | "md";
	isActive?: boolean;
}) {
	const Comp = asChild ? Slot.Root : "a";

	return (
		<Comp
			data-slot="sidebar-menu-sub-button"
			data-sidebar="menu-sub-button"
			data-size={size}
			data-active={isActive}
			className={cn(
				"flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground no-underline",
				"data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
				size === "sm" && "text-xs",
				size === "md" && "text-sm",
				"group-data-[collapsible=icon]:hidden",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
};
