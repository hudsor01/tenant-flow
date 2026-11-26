import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackWidget } from "../feedback-widget";

const { ensure, theme } = vi.hoisted(() => ({
	ensure: vi.fn(),
	theme: { resolvedTheme: "light" as string | undefined },
}));
vi.mock("../feedback-integration", () => ({
	ensureFeedbackIntegration: ensure,
}));
vi.mock("next-themes", () => ({ useTheme: () => theme }));

function feedbackStub() {
	const removeFromDom = vi.fn();
	const createWidget = vi.fn(() => ({ removeFromDom }));
	const setTheme = vi.fn();
	ensure.mockReturnValue({ createWidget, setTheme });
	return { createWidget, removeFromDom, setTheme };
}

describe("FeedbackWidget", () => {
	afterEach(() => {
		ensure.mockReset();
		theme.resolvedTheme = "light";
	});

	it("loads the integration and adds the button while the owner shell is mounted, removing it after", async () => {
		const { createWidget, removeFromDom } = feedbackStub();

		const { container, unmount } = render(<FeedbackWidget />);
		expect(container).toBeEmptyDOMElement();
		await waitFor(() => expect(createWidget).toHaveBeenCalledTimes(1));
		expect(removeFromDom).not.toHaveBeenCalled();

		unmount();
		expect(removeFromDom).toHaveBeenCalledTimes(1);
	});

	it("follows the app's resolved theme, not the OS", async () => {
		const { setTheme } = feedbackStub();
		theme.resolvedTheme = "dark";
		const { rerender } = render(<FeedbackWidget />);
		await waitFor(() => expect(setTheme).toHaveBeenLastCalledWith("dark"));

		theme.resolvedTheme = "light";
		rerender(<FeedbackWidget />);
		expect(setTheme).toHaveBeenLastCalledWith("light");
	});

	it("adds no button when Sentry isn't sending", async () => {
		ensure.mockReturnValue(null);
		const { unmount } = render(<FeedbackWidget />);
		await waitFor(() => expect(ensure).toHaveBeenCalled());
		expect(() => unmount()).not.toThrow();
	});

	it("adds no button when unmounted before the integration loads", async () => {
		const { createWidget } = feedbackStub();
		const { unmount } = render(<FeedbackWidget />);
		unmount();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(createWidget).not.toHaveBeenCalled();
	});
});
