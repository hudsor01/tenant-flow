/**
 * A `vi.mock` factory reads no module-scope binding that is not declared
 * through `vi.hoisted` (CLAUDE.md, Testing: "`vi.hoisted()` for any mock
 * variable referenced in `vi.mock()`"). Vitest hoists every `vi.mock` above
 * the file's imports and declarations, so a factory that names a plain
 * `const` works only while nothing calls it before the declaration runs.
 *
 * 66.2-39 fix round 4 (G37): the PR added seven such bindings in six files
 * (app-shell-sections' pathname and router mocks, label-in-name's pathname
 * mock, property-type-rendering's update mock, two fixtures, and
 * tenant-exports' captured action-bar props); they are hoisted now. The scan
 * covers every tracked `*.test.ts(x)` that calls `vi.mock`: a top-level `const`/`let`/`var` that is not `vi.hoisted(…)`
 * (awaited or not), referred to inside a `vi.mock(path, factory)` factory and
 * not redeclared there. `RATCHET` lists the older bindings, file by file, as
 * they stood when the scan landed; the list can only shrink.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseSync } from "rolldown/utils";
import { describe, expect, it } from "vitest";

type Node = {
	type: string;
	start: number;
	end: number;
	[key: string]: unknown;
};

function isNode(value: unknown): value is Node {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { type?: unknown }).type === "string"
	);
}

function childNodes(node: Node): Node[] {
	const out: Node[] = [];
	for (const [key, value] of Object.entries(node)) {
		if (key === "type" || key === "start" || key === "end") continue;
		if (Array.isArray(value)) {
			for (const v of value) if (isNode(v)) out.push(v);
		} else if (isNode(value)) {
			out.push(value);
		}
	}
	return out;
}

function visit(node: Node, parents: Node[], fn: (n: Node, p: Node[]) => void) {
	fn(node, parents);
	const next = [...parents, node];
	for (const child of childNodes(node)) visit(child, next, fn);
}

function bindingNames(pattern: unknown): string[] {
	if (!isNode(pattern)) return [];
	if (pattern.type === "Identifier") return [String(pattern.name)];
	if (pattern.type === "ObjectPattern") {
		return ((pattern.properties as Node[]) ?? []).flatMap((p) =>
			p.type === "RestElement"
				? bindingNames(p.argument)
				: bindingNames(p.value),
		);
	}
	if (pattern.type === "ArrayPattern") {
		return ((pattern.elements as unknown[]) ?? []).flatMap(bindingNames);
	}
	if (pattern.type === "AssignmentPattern") return bindingNames(pattern.left);
	if (pattern.type === "RestElement") return bindingNames(pattern.argument);
	return [];
}

function isViCall(node: unknown, method: string): node is Node {
	if (!isNode(node) || node.type !== "CallExpression") return false;
	const callee = node.callee;
	return (
		isNode(callee) &&
		callee.type === "MemberExpression" &&
		isNode(callee.object) &&
		callee.object.name === "vi" &&
		isNode(callee.property) &&
		callee.property.name === method
	);
}

/** `vi.hoisted(…)`, awaited or not. */
function isHoisted(init: unknown): boolean {
	let node = init;
	while (isNode(node) && node.type === "AwaitExpression") node = node.argument;
	return isViCall(node, "hoisted");
}

/** Each module-scope binding a `vi.mock` factory in `source` reads, sorted. */
function unhoistedMockBindings(path: string, source: string): string[] {
	const { program, errors } = parseSync(path, source, {
		lang: path.endsWith(".tsx") ? "tsx" : "ts",
	});
	if (errors.length > 0) throw new Error(`${path}: ${errors[0]?.message}`);
	const root: unknown = program;
	if (!isNode(root)) throw new Error(`${path}: the parser returned no program`);
	const moduleBindings = new Set<string>();
	for (const statement of (root.body as Node[]) ?? []) {
		const declaration =
			statement.type === "ExportNamedDeclaration"
				? statement.declaration
				: statement;
		if (!isNode(declaration) || declaration.type !== "VariableDeclaration") {
			continue;
		}
		for (const d of (declaration.declarations as Node[]) ?? []) {
			if (isHoisted(d.init)) continue;
			for (const name of bindingNames(d.id)) moduleBindings.add(name);
		}
	}
	const found = new Set<string>();
	visit(root, [], (node) => {
		if (!isViCall(node, "mock")) return;
		const factory = (node.arguments as unknown[] | undefined)?.[1];
		if (!isNode(factory)) return;
		const local = new Set<string>();
		visit(factory, [], (inner) => {
			if (inner.type === "VariableDeclarator") {
				for (const name of bindingNames(inner.id)) local.add(name);
			}
			if (/Function/.test(inner.type)) {
				for (const p of (inner.params as unknown[]) ?? []) {
					for (const name of bindingNames(p)) local.add(name);
				}
			}
		});
		visit(factory, [], (inner, parents) => {
			if (inner.type !== "Identifier") return;
			const name = String(inner.name);
			if (!moduleBindings.has(name) || local.has(name)) return;
			const parent = parents[parents.length - 1];
			if (
				parent?.type === "MemberExpression" &&
				parent.property === inner &&
				!parent.computed
			) {
				return;
			}
			if (
				parent?.type === "Property" &&
				parent.key === inner &&
				!parent.computed &&
				!parent.shorthand
			) {
				return;
			}
			found.add(name);
		});
	});
	return [...found].sort();
}

/**
 * The older bindings: `path name name …`, one line per file. Remove a name
 * when its binding moves into `vi.hoisted` (or out of the factory).
 */
const RATCHET = `
src/app/(owner)/@modal/(.)leases/[id]/edit/page.test.tsx leaseFormProps mockBack mockReplace useQueryMock
src/app/(owner)/@modal/(.)maintenance/[id]/edit/page.test.tsx maintenanceFormProps mockBack useQueryMock
src/app/(owner)/@modal/(.)maintenance/new/page.test.tsx maintenanceFormProps
src/app/(owner)/@modal/(.)properties/[id]/edit/page.test.tsx propertyFormProps useQueryMock
src/app/(owner)/@modal/(.)properties/new/page.test.tsx mockBack propertyFormProps
src/app/(owner)/@modal/(.)tenants/new/page.test.tsx mockUseQuery scenario
src/app/(owner)/@modal/(.)units/[id]/edit/page.test.tsx mockBack unitFormProps
src/app/(owner)/@modal/(.)units/new/page.test.tsx mockBack unitFormProps
src/app/(owner)/documents/__tests__/recent-documents-panel.test.tsx mockUseDocumentCategories mockUseQuery
src/app/(owner)/documents/templates/components/template-definition.test.ts mockInvalidateQueries mockToastError mockToastSuccess
src/app/(owner)/leases/page.test.tsx lastTableProps pushMock useLeaseListMock
src/app/(owner)/profile/__tests__/profile-page.test.tsx mockChangePassword mockProfileData mockPush mockRemoveAvatar mockSignOut mockUpdatePhone mockUpdateProfile mockUploadAvatar
src/app/(owner)/tenants/new/page.test.tsx mockUseQuery scenario
src/components/applications/__tests__/application-detail.test.tsx pushSpy
src/components/applications/__tests__/application-queue.test.tsx mockUseQuery
src/components/billing/__tests__/subscription-status-banner.test.tsx mockUseSubscriptionStatus
src/components/contact/__tests__/contact-form.test.tsx invokeMock
src/components/documents/__tests__/documents-section.test.tsx capturedDeleteOnSuccess mockDeleteMutate mockToastError mockToastSuccess mockToastWarning mockUploadMutate mockUseDocumentCategories mockUseQuery uploadPending
src/components/documents/__tests__/documents-vault.test.tsx categoriesParamValue entityParamValue fromParamValue mockGetSession mockSetCategoriesParam mockSetEntityParam mockSetFromParam mockSetPageParam mockSetQueryParam mockSetToParam mockToastError mockUseDocumentCategories mockUseQuery pageParamValue queryParamValue toParamValue
src/components/leases/__tests__/download-signed-lease-button.test.tsx finalizeMutate mockUseSignedDocumentUrl toastError
src/components/leases/__tests__/lease-action-buttons.test.tsx mockDeleteLease mockRenewLease mockResendSignature mockSendForSignature mockSignAsOwner mockTerminateLease
src/components/leases/__tests__/lease-details.test.tsx mockLease
src/components/leases/__tests__/lease-form.test.tsx mockCreateLeaseMutation mockRouterBack mockRouterPush mockUpdateLeaseMutation
src/components/leases/__tests__/lease-signature-status.test.tsx mockUseLeaseSignatureStatus
src/components/leases/__tests__/send-for-signature-button.test.tsx mockResendSignature mockSendForSignature
src/components/leases/dialogs/__tests__/renew-lease-dialog.test.tsx mockRenewLease
src/components/leases/wizard/__tests__/selection-step-filtering.property.test.tsx mockFrom
src/components/maintenance/maintenance-view.client.test.tsx mockReplace searchParamsString useQueryMock
src/components/marketing/__tests__/lead-capture-modal.test.tsx invokeMock
src/components/properties/__tests__/add-unit-panel.test.tsx mockMutateAsync
src/components/properties/__tests__/edit-unit-panel.test.tsx mockMutateAsync
src/components/properties/__tests__/properties.test.tsx actionBarProps deleteMutateAsync updateMutateAsync
src/components/properties/__tests__/property-image-dropzone.test.tsx capturedOptions mockUploadReturn
src/components/properties/__tests__/property-units-table.test.tsx mockUseMutation mockUseQuery
src/components/settings/__tests__/categories-settings.test.tsx mockCreate mockDelete mockReorder mockToastError mockToastSuccess mockUpdate mockUseDocumentCategories reorderHooks
src/components/settings/__tests__/notification-settings.test.tsx mockMutate mockUseSettings
src/components/settings/__tests__/owner-emergency-contact-section.test.tsx mockDeleteMutation mockUpdateMutation mockUseOwnerEmergencyContact
src/components/shell/__tests__/app-shell-nav.test.tsx mockPathname
src/components/shell/__tests__/app-shell.test.tsx mockPathname mockProperties mockRouter mockSignOutMutation mockTenants mockUser
src/components/shell/__tests__/main-nav.test.tsx mockPathname
src/components/tenants/__tests__/add-tenant-form-prefill.test.tsx mockCreateTenant mockRecordConversion mockRouterPush
src/components/tenants/__tests__/add-tenant-form.property.test.tsx mockCreateTenant mockRouterBack mockRouterPush mockRouterRefresh
src/components/tenants/__tests__/tenants.test.tsx actionBarProps
src/components/units/__tests__/unit-form.test.tsx mockRouterBack mockRouterPush
src/components/units/unit-form.client.test.tsx mockCreate mockPush mockUpdate
src/hooks/api/__tests__/use-inspection-mutations.test.tsx supabaseFromMock
src/hooks/api/__tests__/use-lease.test.tsx supabaseAuthGetSessionMock supabaseAuthGetUserMock supabaseFromMock supabaseRpcMock supabaseStorageFromMock
src/hooks/api/__tests__/use-tenant.test.tsx supabaseAuthGetSessionMock supabaseAuthGetUserMock supabaseFromMock supabaseRpcMock
src/lib/__tests__/csp-header.test.ts mockUpdateSession
src/lib/supabase/__tests__/middleware-routing.test.ts mockCaptureException mockCaptureMessage mockUpdateSession mockUserRow mockUserRowError mockUserRowThrow
src/lib/supabase/__tests__/middleware.test.ts mockCaptureException mockCreateServerClient
`;

function ratchetPairs(text: string): string[] {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.flatMap((line) => {
			const [path, ...names] = line.split(/\s+/);
			return names.map((name) => `${path} ${name}`);
		});
}

function trackedTestFiles(): string[] {
	const out = execFileSync("git", ["ls-files", "-z"], {
		cwd: process.cwd(),
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	});
	return out
		.split("\0")
		.filter(
			(path) => /\.test\.tsx?$/.test(path) && !path.startsWith(".planning/"),
		);
}

function readOrNull(path: string): string | null {
	try {
		return readFileSync(path, "utf8");
	} catch {
		// Tracked but deleted in the working tree: nothing to scan.
		return null;
	}
}

describe("vi.mock factories read only vi.hoisted bindings", () => {
	it("flags each shape it describes, and passes the hoisted ones", () => {
		expect(
			unhoistedMockBindings(
				"a.test.ts",
				'const mockPathname = vi.fn();\nvi.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));',
			),
		).toEqual(["mockPathname"]);
		expect(
			unhoistedMockBindings(
				"b.test.tsx",
				'const ROW = { id: "1" };\nconst { a, b } = { a: 1, b: 2 };\nvi.mock("x", () => ({ row: ROW, pair: [a, b] }));',
			),
		).toEqual(["ROW", "a", "b"]);
		expect(
			unhoistedMockBindings(
				"c.test.ts",
				[
					"const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));",
					"const late = await vi.hoisted(async () => 1);",
					'vi.mock("x", () => ({ from: mockFrom, n: late }));',
				].join("\n"),
			),
		).toEqual([]);
		expect(
			unhoistedMockBindings(
				"d.test.ts",
				[
					"const user = { id: 1 };",
					"const other = 2;",
					'vi.mock("x", async () => {',
					"\tconst user = { id: 2 };",
					"\treturn { user, read: (other: number) => other, value: obj.other, other: 3 };",
					"});",
				].join("\n"),
			),
		).toEqual([]);
	});

	it("finds no binding outside the ratchet, and every ratchet entry still there", () => {
		const files = trackedTestFiles();
		expect(files.length).toBeGreaterThan(400);
		const found: string[] = [];
		for (const path of files) {
			const source = readOrNull(path);
			if (source === null || !source.includes("vi.mock(")) continue;
			for (const name of unhoistedMockBindings(path, source)) {
				found.push(`${path} ${name}`);
			}
		}
		const ratchet = new Set(ratchetPairs(RATCHET));
		const added = found.filter((pair) => !ratchet.has(pair));
		expect(
			added,
			`module-scope bindings read in a vi.mock factory; declare them through vi.hoisted:\n${added.join("\n")}`,
		).toEqual([]);
		const present = new Set(found);
		const stale = [...ratchet].filter((pair) => !present.has(pair));
		expect(
			stale,
			`hoisted or gone since the ratchet was written; remove them from RATCHET:\n${stale.join("\n")}`,
		).toEqual([]);
	});
});
