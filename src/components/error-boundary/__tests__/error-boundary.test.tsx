import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentryMock = vi.hoisted(() => ({
	captureException: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: sentryMock.captureException,
}));

const routerMock = vi.hoisted(() => ({
	refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => routerMock,
}));

import { useErrorBoundaryStore } from "#stores/error-boundary-store";
import { ErrorBoundary } from "../error-boundary";

function Boom(): never {
	throw new Error("boom");
}

describe("ErrorBoundary", () => {
	beforeEach(() => {
		// Reset the zustand store between tests.
		useErrorBoundaryStore.getState().clearError();
		sentryMock.captureException.mockClear();
		routerMock.refresh.mockClear();
		// Silence the expected React console.error from intentional throws.
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("renders the default fallback when a child throws", () => {
		render(createElement(ErrorBoundary, null, createElement(Boom)));

		expect(
			screen.getByRole("heading", { name: /something went wrong/i }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/an unexpected error occurred/i),
		).toBeInTheDocument();
	});

	it("routes the error through Sentry as a proper exception", () => {
		render(createElement(ErrorBoundary, null, createElement(Boom)));

		expect(sentryMock.captureException).toHaveBeenCalledTimes(1);
		const [err, ctx] = sentryMock.captureException.mock.calls[0] as [
			Error,
			{ tags: Record<string, string>; extra: Record<string, unknown> },
		];
		expect(err).toBeInstanceOf(Error);
		expect(err.message).toBe("boom");
		expect(ctx.tags).toMatchObject({ boundary: "component-error-boundary" });
		expect(ctx.extra).toHaveProperty("componentStack");
	});

	it("persists the error into the global store", () => {
		render(createElement(ErrorBoundary, null, createElement(Boom)));

		const state = useErrorBoundaryStore.getState().errorState;
		expect(state.hasError).toBe(true);
		expect(state.error?.message).toBe("boom");
		expect(state.errorId).toBeTruthy();
	});

	it('triggers a route refresh on "Try Again"', async () => {
		const user = userEvent.setup();
		const clearErrorSpy = vi.spyOn(
			useErrorBoundaryStore.getState(),
			"clearError",
		);
		render(createElement(ErrorBoundary, null, createElement(Boom)));

		// Pre-condition: store says we errored.
		expect(useErrorBoundaryStore.getState().errorState.hasError).toBe(true);

		await user.click(screen.getByRole("button", { name: /try again/i }));

		// The reset path invokes onReset → handleReset (clears the store) plus
		// router.refresh(). Boom re-throws on the next render so the boundary
		// repopulates the store immediately — the durable signal that retry
		// fired is that clearError was called at least once AND router.refresh
		// ran exactly once.
		expect(clearErrorSpy).toHaveBeenCalled();
		expect(routerMock.refresh).toHaveBeenCalledTimes(1);
	});

	it("renders the explicit fallback prop when provided", () => {
		const fallback = createElement(
			"div",
			{ "data-testid": "custom-fallback" },
			"caught",
		);
		render(
			createElement(ErrorBoundary, { fallback, children: createElement(Boom) }),
		);

		expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
		// Sentry + store side-effects still fire when an explicit fallback is used.
		expect(sentryMock.captureException).toHaveBeenCalledTimes(1);
		expect(useErrorBoundaryStore.getState().errorState.hasError).toBe(true);
	});
});
