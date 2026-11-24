import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackWidget } from "../feedback-widget";

const { sentry, theme } = vi.hoisted(() => ({
	sentry: { getFeedback: vi.fn() },
	theme: { resolvedTheme: "light" as string | undefined },
}));
vi.mock("@sentry/nextjs", () => sentry);
vi.mock("next-themes", () => ({ useTheme: () => theme }));

function feedbackStub() {
	const removeFromDom = vi.fn();
	const createWidget = vi.fn(() => ({ removeFromDom }));
	const setTheme = vi.fn();
	sentry.getFeedback.mockReturnValue({ createWidget, setTheme });
	return { createWidget, removeFromDom, setTheme };
}

describe("FeedbackWidget", () => {
	afterEach(() => {
		sentry.getFeedback.mockReset();
		theme.resolvedTheme = "light";
	});

	it("adds the Sentry button while the owner shell is mounted and removes it after", () => {
		const { createWidget, removeFromDom } = feedbackStub();

		const { container, unmount } = render(<FeedbackWidget />);
		expect(container).toBeEmptyDOMElement();
		expect(createWidget).toHaveBeenCalledTimes(1);
		expect(removeFromDom).not.toHaveBeenCalled();

		unmount();
		expect(removeFromDom).toHaveBeenCalledTimes(1);
	});

	it("follows the app's resolved theme, not the OS", () => {
		const { setTheme } = feedbackStub();
		theme.resolvedTheme = "dark";
		const { rerender } = render(<FeedbackWidget />);
		expect(setTheme).toHaveBeenLastCalledWith("dark");

		theme.resolvedTheme = "light";
		rerender(<FeedbackWidget />);
		expect(setTheme).toHaveBeenLastCalledWith("light");
	});

	it("does nothing when the feedback integration is not registered", () => {
		sentry.getFeedback.mockReturnValue(undefined);
		const { unmount } = render(<FeedbackWidget />);
		expect(() => unmount()).not.toThrow();
	});
});
