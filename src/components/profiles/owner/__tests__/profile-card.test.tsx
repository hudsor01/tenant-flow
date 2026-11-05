/**
 * The owner profile card keeps the 8px it declares between "Property Owner"
 * and the member-since line (66.2-39 fix round 3, G2): the card's column is a
 * flex column, where margins do not collapse, so the base `p` margin added 16px
 * to the line's mt-2 (24px in Chrome).
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfileCard } from "#components/profiles/owner/profile-card";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";

describe("ProfileCard", () => {
	it("leaves no base paragraph margin under the role line", () => {
		render(
			<ProfileCard
				profile={{
					full_name: "Dana Rivera",
					first_name: "Dana",
					last_name: "Rivera",
					avatar_url: null,
					created_at: "2026-01-01T00:00:00Z",
					owner_profile: { properties_count: 3, units_count: 12 },
				}}
				fileInputRef={{ current: null }}
				isPending={false}
				isUploadingAvatar={false}
				isRemovingAvatar={false}
				isSigningOut={false}
				onAvatarClick={() => undefined}
				onAvatarChange={() => undefined}
				onRemoveAvatar={() => undefined}
				onSignOut={() => undefined}
			/>,
		);
		const role = screen.getByText("Property Owner");
		const { neutralized, baseline } = computeParagraphCascade(role);
		expect(baseline.marginBottom).toBe("16px");
		expect(neutralized.marginBottom).toBe("0px");
	});
});
