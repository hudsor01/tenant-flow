/**
 * @vitest-environment jsdom
 * data-slot attributes on vendored ui primitives (new-york-v4 values, ledger C14).
 *
 * Each primitive renders the upstream data-slot on every part the local file ships, placed
 * before the props spread so a consumer-supplied data-slot wins.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert";
import { Badge } from "#components/ui/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#components/ui/breadcrumb";
import { Button } from "#components/ui/button";
import { ButtonGroup } from "#components/ui/button-group";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { Checkbox } from "#components/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#components/ui/collapsible";
import { Input } from "#components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components/ui/tabs";
import { Textarea } from "#components/ui/textarea";

const slotCount = (value: string) =>
	document.querySelectorAll(`[data-slot="${value}"]`).length;

const classTokens = (element: Element | null) =>
	(element?.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);

describe("Alert data-slots", () => {
	it("renders alert, alert-title and alert-description", () => {
		render(
			<Alert>
				<AlertTitle>Title</AlertTitle>
				<AlertDescription>Description</AlertDescription>
			</Alert>,
		);
		const alert = screen.getByRole("alert");
		expect(alert).toHaveAttribute("data-slot", "alert");
		expect(screen.getByText("Title")).toHaveAttribute(
			"data-slot",
			"alert-title",
		);
		expect(screen.getByText("Description")).toHaveAttribute(
			"data-slot",
			"alert-description",
		);
	});
});

describe("Badge data-slots", () => {
	it("renders badge on the span", () => {
		render(<Badge>New</Badge>);
		const badge = screen.getByText("New");
		expect(badge.tagName).toBe("SPAN");
		expect(badge).toHaveAttribute("data-slot", "badge");
	});

	it("renders badge on the asChild link", () => {
		render(
			<Badge asChild>
				<a href="/badges">Linked</a>
			</Badge>,
		);
		const link = screen.getByRole("link", { name: "Linked" });
		expect(link).toHaveAttribute("data-slot", "badge");
	});
});

describe("Breadcrumb data-slots", () => {
	it("renders the six breadcrumb slots and keeps the aria attributes", () => {
		render(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/home">Home</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<a href="/section">Section</a>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Current</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>,
		);
		const nav = screen.getByRole("navigation", { name: "breadcrumb" });
		expect(nav).toHaveAttribute("data-slot", "breadcrumb");
		expect(screen.getByRole("list")).toHaveAttribute(
			"data-slot",
			"breadcrumb-list",
		);
		expect(slotCount("breadcrumb-item")).toBe(3);
		expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
			"data-slot",
			"breadcrumb-link",
		);
		expect(screen.getByRole("link", { name: "Section" })).toHaveAttribute(
			"data-slot",
			"breadcrumb-link",
		);
		const page = screen.getByText("Current");
		expect(page).toHaveAttribute("data-slot", "breadcrumb-page");
		expect(page).toHaveAttribute("aria-current", "page");
		const separators = document.querySelectorAll(
			'[data-slot="breadcrumb-separator"]',
		);
		expect(separators).toHaveLength(2);
		for (const separator of separators) {
			expect(separator).toHaveAttribute("aria-hidden", "true");
		}
	});
});

describe("Checkbox data-slots", () => {
	it("renders checkbox and checkbox-indicator when checked", () => {
		render(<Checkbox defaultChecked aria-label="Accept" />);
		const checkbox = screen.getByRole("checkbox", { name: "Accept" });
		expect(checkbox).toHaveAttribute("data-slot", "checkbox");
		const indicator = checkbox.querySelector(
			'[data-slot="checkbox-indicator"]',
		);
		expect(indicator).not.toBeNull();
	});
});

describe("Collapsible data-slots", () => {
	it("renders the three slots and wires aria-controls to the content id", () => {
		const { container } = render(
			<Collapsible defaultOpen>
				<CollapsibleTrigger>Toggle</CollapsibleTrigger>
				<CollapsibleContent>Body</CollapsibleContent>
			</Collapsible>,
		);
		const root = container.firstElementChild;
		expect(root).toHaveAttribute("data-slot", "collapsible");
		const trigger = screen.getByRole("button", { name: "Toggle" });
		expect(trigger).toHaveAttribute("data-slot", "collapsible-trigger");
		const content = screen.getByText("Body");
		expect(content).toHaveAttribute("data-slot", "collapsible-content");
		const contentId = content.getAttribute("id");
		expect(contentId).toBeTruthy();
		expect(trigger).toHaveAttribute("aria-controls", contentId);
	});
});

describe("Input data-slots", () => {
	it("renders input", () => {
		render(<Input aria-label="Name" />);
		expect(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute(
			"data-slot",
			"input",
		);
	});

	it("lets a consumer data-slot win over the default", () => {
		render(<Input aria-label="Custom" data-slot="custom" />);
		expect(screen.getByRole("textbox", { name: "Custom" })).toHaveAttribute(
			"data-slot",
			"custom",
		);
	});
});

describe("InputGroup data-slots", () => {
	it("renders input-group, input-group-addon and input-group-control", () => {
		render(
			<InputGroup data-testid="group">
				<InputGroupInput aria-label="Search" />
				<InputGroupAddon data-testid="addon">Addon</InputGroupAddon>
			</InputGroup>,
		);
		expect(screen.getByTestId("group")).toHaveAttribute(
			"data-slot",
			"input-group",
		);
		expect(screen.getByTestId("addon")).toHaveAttribute(
			"data-slot",
			"input-group-addon",
		);
		const input = screen.getByRole("textbox", { name: "Search" });
		expect(input.tagName).toBe("INPUT");
		expect(input).toHaveAttribute("data-slot", "input-group-control");
	});
});

describe("Select data-slots", () => {
	it("renders trigger, value, content, item and item-indicator", () => {
		render(
			<Select defaultOpen defaultValue="a">
				<SelectTrigger aria-label="Choice">
					<SelectValue placeholder="Pick one" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="a">Alpha</SelectItem>
					<SelectItem value="b">Beta</SelectItem>
				</SelectContent>
			</Select>,
		);
		expect(slotCount("select-trigger")).toBe(1);
		expect(slotCount("select-value")).toBe(1);
		expect(slotCount("select-content")).toBe(1);
		expect(slotCount("select-item")).toBe(2);
		expect(slotCount("select-item-indicator")).toBe(2);
		const trigger = document.querySelector('[data-slot="select-trigger"]');
		expect(trigger).toHaveAttribute("data-size", "default");
	});
});

describe("Tabs data-slots", () => {
	it("renders tabs, tabs-list, tabs-trigger and tabs-content", () => {
		const { container } = render(
			<Tabs defaultValue="a">
				<TabsList>
					<TabsTrigger value="a">First</TabsTrigger>
					<TabsTrigger value="b">Second</TabsTrigger>
				</TabsList>
				<TabsContent value="a">Panel A</TabsContent>
				<TabsContent value="b">Panel B</TabsContent>
			</Tabs>,
		);
		expect(container.firstElementChild).toHaveAttribute("data-slot", "tabs");
		expect(screen.getByRole("tablist")).toHaveAttribute(
			"data-slot",
			"tabs-list",
		);
		expect(screen.getByRole("tab", { name: "First" })).toHaveAttribute(
			"data-slot",
			"tabs-trigger",
		);
		expect(screen.getByRole("tabpanel")).toHaveAttribute(
			"data-slot",
			"tabs-content",
		);
	});
});

describe("Textarea data-slots", () => {
	it("renders textarea", () => {
		render(<Textarea aria-label="Notes" />);
		expect(screen.getByRole("textbox", { name: "Notes" })).toHaveAttribute(
			"data-slot",
			"textarea",
		);
	});
});

describe("Card data-slots", () => {
	it("renders the seven card slots", () => {
		render(
			<Card data-testid="card">
				<CardHeader data-testid="header">
					<CardTitle>Title</CardTitle>
					<CardDescription>Description</CardDescription>
					<CardAction data-testid="action">Action</CardAction>
				</CardHeader>
				<CardContent>Content</CardContent>
				<CardFooter>Footer</CardFooter>
			</Card>,
		);
		expect(screen.getByTestId("card")).toHaveAttribute("data-slot", "card");
		expect(screen.getByTestId("header")).toHaveAttribute(
			"data-slot",
			"card-header",
		);
		expect(screen.getByText("Title")).toHaveAttribute(
			"data-slot",
			"card-title",
		);
		expect(screen.getByText("Description")).toHaveAttribute(
			"data-slot",
			"card-description",
		);
		expect(screen.getByTestId("action")).toHaveAttribute(
			"data-slot",
			"card-action",
		);
		expect(screen.getByText("Content")).toHaveAttribute(
			"data-slot",
			"card-content",
		);
		expect(screen.getByText("Footer")).toHaveAttribute(
			"data-slot",
			"card-footer",
		);
	});

	it("keys the header action column on the card-action data-slot", () => {
		render(
			<CardHeader data-testid="header">
				<CardAction data-testid="action">Action</CardAction>
			</CardHeader>,
		);
		const header = classTokens(screen.getByTestId("header"));
		expect(header).toContain(
			"has-data-[slot=card-action]:grid-cols-[1fr_auto]",
		);
		expect(header.some((token) => token.includes(".card-action"))).toBe(false);
		expect(classTokens(screen.getByTestId("action"))).not.toContain(
			"card-action",
		);
	});
});

describe("ButtonGroup data-slots", () => {
	it("renders button-group and keys the nested gap on it", () => {
		render(
			<ButtonGroup data-testid="group">
				<Button variant="outline">One</Button>
			</ButtonGroup>,
		);
		const group = screen.getByTestId("group");
		expect(group).toHaveAttribute("data-slot", "button-group");
		expect(group).toHaveAttribute("role", "group");
		const tokens = classTokens(group);
		expect(tokens).toContain("has-[>[data-slot=button-group]]:gap-2");
		expect(tokens.some((token) => token.includes(">.button-group"))).toBe(
			false,
		);
		expect(tokens).toContain("[&>.select-trigger:not([class*='w-'])]:w-fit");
	});
});
