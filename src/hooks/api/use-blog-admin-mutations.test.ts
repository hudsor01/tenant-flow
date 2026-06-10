import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { publishBlogPostMock, rejectBlogPostMock } = vi.hoisted(() => ({
	publishBlogPostMock: vi.fn(),
	rejectBlogPostMock: vi.fn(),
}));

vi.mock("#app/actions/blog-publish", () => ({
	publishBlogPost: publishBlogPostMock,
	rejectBlogPost: rejectBlogPostMock,
}));

// Silence the sonner toast side-effects from the mutation callbacks.
vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

import { blogQueries } from "./query-keys/blog-keys";
import {
	useApproveBlogMutation,
	useRejectBlogMutation,
} from "./use-blog-admin-mutations";

function renderWithClient<TProps, TReturn>(
	hook: (props: TProps) => TReturn,
): { result: { current: TReturn }; queryClient: QueryClient } {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
	const { result } = renderHook(hook, { wrapper });
	return { result, queryClient };
}

afterEach(() => {
	publishBlogPostMock.mockReset();
	rejectBlogPostMock.mockReset();
});

describe("useApproveBlogMutation", () => {
	it("calls publishBlogPost with (id, slug)", async () => {
		publishBlogPostMock.mockResolvedValue({ ok: true });

		const { result } = renderWithClient(() => useApproveBlogMutation());
		await result.current.mutateAsync({ id: "blog-1", slug: "my-slug" });

		expect(publishBlogPostMock).toHaveBeenCalledTimes(1);
		expect(publishBlogPostMock).toHaveBeenCalledWith("blog-1", "my-slug");
	});

	it("invalidates blogQueries.all() on success", async () => {
		publishBlogPostMock.mockResolvedValue({ ok: true });

		const { result, queryClient } = renderWithClient(() =>
			useApproveBlogMutation(),
		);
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		await result.current.mutateAsync({ id: "blog-1", slug: "my-slug" });

		await waitFor(() => {
			const invalidatedKeys = invalidateSpy.mock.calls.map(
				(call) => (call[0] as { queryKey: unknown }).queryKey,
			);
			expect(invalidatedKeys).toContainEqual(blogQueries.all());
		});
	});

	it("throws on a { ok: false } result (error path, not silent success)", async () => {
		publishBlogPostMock.mockResolvedValue({
			ok: false,
			error: "Not authorized",
		});

		const { result } = renderWithClient(() => useApproveBlogMutation());

		await expect(
			result.current.mutateAsync({ id: "blog-1", slug: "my-slug" }),
		).rejects.toMatchObject({
			message: expect.stringContaining("Not authorized"),
		});
	});
});

describe("useRejectBlogMutation", () => {
	it("calls rejectBlogPost with (id)", async () => {
		rejectBlogPostMock.mockResolvedValue({ ok: true });

		const { result } = renderWithClient(() => useRejectBlogMutation());
		await result.current.mutateAsync({ id: "blog-2" });

		expect(rejectBlogPostMock).toHaveBeenCalledTimes(1);
		expect(rejectBlogPostMock).toHaveBeenCalledWith("blog-2");
	});

	it("invalidates blogQueries.all() on success", async () => {
		rejectBlogPostMock.mockResolvedValue({ ok: true });

		const { result, queryClient } = renderWithClient(() =>
			useRejectBlogMutation(),
		);
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		await result.current.mutateAsync({ id: "blog-2" });

		await waitFor(() => {
			const invalidatedKeys = invalidateSpy.mock.calls.map(
				(call) => (call[0] as { queryKey: unknown }).queryKey,
			);
			expect(invalidatedKeys).toContainEqual(blogQueries.all());
		});
	});

	it("throws on a { ok: false } result (error path)", async () => {
		rejectBlogPostMock.mockResolvedValue({
			ok: false,
			error: "Failed to reject post",
		});

		const { result } = renderWithClient(() => useRejectBlogMutation());

		await expect(
			result.current.mutateAsync({ id: "blog-2" }),
		).rejects.toMatchObject({
			message: expect.stringContaining("Failed to reject post"),
		});
	});
});
