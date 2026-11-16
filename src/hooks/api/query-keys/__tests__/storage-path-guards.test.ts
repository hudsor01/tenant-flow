/**
 * Every Storage path read back from the database passes the storage path check
 * before it reaches Storage: a batch skips a failing path, a single operation
 * refuses it. supabase-js puts a path into the request URL unencoded, so one
 * holding a dot segment would make the URL parser move the request out of its
 * folder. Each site below gets one stored path that fails the check
 * (`%2e%2e` is ".." to the URL parser) and must keep it away from the Storage
 * mock. documentQueries.list, the lease signed URL and the property-image
 * delete are pinned beside their own factories.
 */

import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiagnosticError } from "#lib/diagnostic-error";
import { createQueryChain } from "#test/mocks/supabase-query-mock";

const {
	supabaseFromMock,
	supabaseRpcMock,
	createSignedUrlsMock,
	removeMock,
	storageFromMock,
	loggerWarnMock,
} = vi.hoisted(() => ({
	supabaseFromMock: vi.fn(),
	supabaseRpcMock: vi.fn(),
	createSignedUrlsMock: vi.fn(),
	removeMock: vi.fn(),
	storageFromMock: vi.fn(),
	loggerWarnMock: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		from: supabaseFromMock,
		rpc: supabaseRpcMock,
		storage: { from: storageFromMock },
	}),
}));

vi.mock("#lib/frontend-logger", () => {
	const logger = {
		info: vi.fn(),
		error: vi.fn(),
		warn: loggerWarnMock,
		debug: vi.fn(),
	};
	return { logger, createLogger: () => logger };
});

import { documentMutations } from "../document-keys";
import { documentSearchQueries } from "../document-search-keys";
import { inspectionQueries } from "../inspection-keys";
import { inspectionMutations } from "../inspection-mutation-options";
import { maintenanceMutations, maintenanceQueries } from "../maintenance-keys";

const MUTATION_CONTEXT = { client: new QueryClient(), meta: undefined };

const ID = "3f2b8c1e-9d4a-4e6b-8f1c-2a7d5e9b0c34";
const SAFE_PATH = `property/${ID}/1700000000000-lease.pdf`;
const UNSAFE_PATH = `property/${ID}/%2e%2e/%2e%2e/rest/v1/users`;

/** Signs every path it is handed, as Storage would for the owner's objects. */
function signEveryPath() {
	createSignedUrlsMock.mockImplementation(async (paths: string[]) => ({
		data: paths.map((path) => ({
			path,
			signedUrl: `https://signed.example/${path}`,
			error: null,
		})),
		error: null,
	}));
}

beforeEach(() => {
	vi.clearAllMocks();
	storageFromMock.mockReturnValue({
		createSignedUrls: createSignedUrlsMock,
		remove: removeMock,
	});
	removeMock.mockResolvedValue({ data: [], error: null });
	signEveryPath();
});

describe("batches skip a stored path that fails the check", () => {
	it("documentSearchQueries.list signs only the safe path", async () => {
		const row = {
			id: "00000000-0000-0000-0000-000000000001",
			entity_type: "property",
			entity_id: ID,
			document_type: "lease",
			mime_type: "application/pdf",
			file_path: SAFE_PATH,
			storage_url: SAFE_PATH,
			file_size: 1024,
			title: "Lease",
			tags: [],
			description: null,
			owner_user_id: "00000000-0000-0000-0000-000000000003",
			created_at: "2026-04-25T00:00:00Z",
			total_count: 2,
		};
		supabaseRpcMock.mockResolvedValue({
			data: [row, { ...row, id: "unsafe", file_path: UNSAFE_PATH }],
			error: null,
		});

		const result = await documentSearchQueries.list({}).queryFn?.({} as never);

		expect(storageFromMock).toHaveBeenCalledWith("tenant-documents");
		expect(createSignedUrlsMock).toHaveBeenCalledTimes(1);
		expect(createSignedUrlsMock).toHaveBeenCalledWith([SAFE_PATH], 3600);
		expect(result?.rows.map((r) => r.signed_url)).toEqual([
			`https://signed.example/${SAFE_PATH}`,
			null,
		]);
	});

	it("inspectionQueries.detailQuery signs only the safe photo", async () => {
		const safePhoto = { id: "photo-1", storage_path: `${ID}/room-1/a.jpg` };
		const unsafePhoto = {
			id: "photo-2",
			storage_path: `${ID}/room-1/%2e%2e/%2e%2e/b.jpg`,
		};
		supabaseFromMock.mockReturnValue(
			createQueryChain({
				data: {
					id: ID,
					inspection_type: "move_in",
					status: "completed",
					inspection_rooms: [
						{
							id: "room-1",
							room_type: "bedroom",
							condition_rating: "good",
							inspection_photos: [safePhoto, unsafePhoto],
						},
					],
				},
			}),
		);

		const result = await inspectionQueries
			.detailQuery(ID)
			.queryFn?.({} as never);

		expect(storageFromMock).toHaveBeenCalledWith("inspection-photos");
		expect(createSignedUrlsMock).toHaveBeenCalledTimes(1);
		expect(createSignedUrlsMock).toHaveBeenCalledWith(
			[safePhoto.storage_path],
			3600,
		);
		expect(result?.rooms?.[0]?.photos).toEqual([
			{
				...safePhoto,
				publicUrl: `https://signed.example/${safePhoto.storage_path}`,
			},
			unsafePhoto,
		]);
	});

	it("maintenanceQueries.photos signs only the safe photo", async () => {
		const safeRow = { id: "photo-1", storage_path: `${ID}/1700-a.jpg` };
		const unsafeRow = { id: "photo-2", storage_path: `${ID}/%2e%2e/b.jpg` };
		supabaseFromMock.mockReturnValue(
			createQueryChain({ data: [safeRow, unsafeRow] }),
		);

		const result = await maintenanceQueries.photos(ID).queryFn?.({} as never);

		expect(storageFromMock).toHaveBeenCalledWith("maintenance-photos");
		expect(createSignedUrlsMock).toHaveBeenCalledTimes(1);
		expect(createSignedUrlsMock).toHaveBeenCalledWith(
			[safeRow.storage_path],
			3600,
		);
		expect(result?.map((r) => r.signed_url)).toEqual([
			`https://signed.example/${safeRow.storage_path}`,
			null,
		]);
	});

	it("inspectionMutations.deleteRoom removes only the safe photo", async () => {
		const safePath = `${ID}/room-1/a.jpg`;
		supabaseFromMock.mockImplementation((table: string) =>
			table === "inspection_photos"
				? createQueryChain({
						data: [
							{ storage_path: safePath },
							{ storage_path: `${ID}/room-1/..\\..\\b.jpg` },
						],
					})
				: createQueryChain({ data: null }),
		);

		await inspectionMutations
			.deleteRoom()
			.mutationFn?.("room-1", MUTATION_CONTEXT);

		expect(supabaseFromMock).toHaveBeenCalledWith("inspection_rooms");
		expect(storageFromMock).toHaveBeenCalledWith("inspection-photos");
		expect(removeMock).toHaveBeenCalledTimes(1);
		expect(removeMock).toHaveBeenCalledWith([safePath]);
	});
});

describe("single operations refuse a path that fails the check", () => {
	it("inspectionMutations.recordPhoto rejects before the insert", async () => {
		await expect(
			inspectionMutations.recordPhoto().mutationFn?.(
				{
					inspection_room_id: "room-1",
					inspection_id: ID,
					storage_path: `${ID}/room-1/%2e%2e/a.jpg`,
					file_name: "a.jpg",
					mime_type: "image/jpeg",
				},
				MUTATION_CONTEXT,
			),
		).rejects.toBeInstanceOf(DiagnosticError);

		expect(supabaseFromMock).not.toHaveBeenCalled();
		expect(removeMock).not.toHaveBeenCalled();
	});

	it("maintenanceMutations.deletePhoto drops the row but never removes the path", async () => {
		supabaseFromMock.mockReturnValue(createQueryChain({ data: null }));

		await expect(
			maintenanceMutations
				.deletePhoto()
				.mutationFn?.(
					{ photoId: "photo-1", storagePath: `${ID}/%2e%2e/b.jpg` },
					MUTATION_CONTEXT,
				),
		).resolves.toBeUndefined();

		expect(supabaseFromMock).toHaveBeenCalledWith("maintenance_request_photos");
		expect(removeMock).not.toHaveBeenCalled();
	});

	it("documentMutations.delete drops the row, never removes the path, and logs the orphan", async () => {
		supabaseFromMock.mockReturnValue(
			createQueryChain({ data: [{ id: "doc-1" }] }),
		);

		await expect(
			documentMutations
				.delete()
				.mutationFn?.(
					{ id: "doc-1", storagePath: UNSAFE_PATH },
					MUTATION_CONTEXT,
				),
		).resolves.toBeUndefined();

		expect(supabaseFromMock).toHaveBeenCalledWith("documents");
		expect(removeMock).not.toHaveBeenCalled();
		expect(loggerWarnMock).toHaveBeenCalledWith(
			"Storage remove failed after DB delete; blob is now orphaned",
			expect.objectContaining({ path: UNSAFE_PATH }),
		);
	});

	it("documentMutations.delete still removes a safe path", async () => {
		supabaseFromMock.mockReturnValue(
			createQueryChain({ data: [{ id: "doc-1" }] }),
		);

		await documentMutations
			.delete()
			.mutationFn?.({ id: "doc-1", storagePath: SAFE_PATH }, MUTATION_CONTEXT);

		expect(removeMock).toHaveBeenCalledWith([SAFE_PATH]);
		expect(loggerWarnMock).not.toHaveBeenCalled();
	});
});
