import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldError } from "#components/ui/field";

describe("FieldError", () => {
	it("shows a message once when two validators report it", () => {
		render(
			<FieldError
				errors={[
					{ message: "This field cannot be empty" },
					"This field cannot be empty",
					{ message: "Title must be at least 3 characters" },
				]}
			/>,
		);

		const items = screen.getAllByRole("listitem");
		expect(items.map((item) => item.textContent)).toEqual([
			"This field cannot be empty",
			"Title must be at least 3 characters",
		]);
	});

	it("shows a single message as text, not a list, when every report repeats it", () => {
		render(
			<FieldError
				errors={[{ message: "Invalid UUID format" }, "Invalid UUID format"]}
			/>,
		);

		expect(screen.queryByRole("list")).toBeNull();
		expect(screen.getByRole("alert")).toHaveTextContent("Invalid UUID format");
	});
});
