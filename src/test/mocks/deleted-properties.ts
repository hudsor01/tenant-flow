/**
 * `supabase.from` for a test whose code under test reads the owner's deleted
 * property ids (fetchDeletedPropertyIds: `.from("properties").select("id")
 * .eq(...).eq(...).order(...).range(...)`). Every chain resolves `rows` as the
 * page, so a read of fewer rows than a page ends in one call; `none` is an
 * owner who has deleted nothing.
 */
export function deletedPropertiesFrom(
	rows: readonly { id: string }[] = [],
): (table: string) => unknown {
	return (table: string) => {
		if (table !== "properties") {
			throw new Error(`the code under test reads no table ${table}`);
		}
		const page = Promise.resolve({ data: [...rows], error: null });
		const chain = {
			select: () => chain,
			eq: () => chain,
			order: () => chain,
			range: () => page,
		};
		return chain;
	};
}
