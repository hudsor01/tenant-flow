-- A property can't hold two units with the same number.
--
-- Before: nothing in the database stopped a second "101" on a property. The
-- unit CSV import checks the file and the property's existing units before it
-- inserts (#1132), but the Add Unit and Edit Unit forms had no check at all,
-- and two imports racing each other could both pass theirs.
--
-- After: a unique index on (property_id, lower(btrim(unit_number))), the same
-- key the import compares with (`unitNumberKey` in
-- src/components/units/bulk-import-config.ts), so "101", "101 " and "a101" vs
-- "A101" count as one number. Deleted units (status 'inactive', the soft-delete
-- sentinel) are left out, so a deleted unit's number can be used again. A NULL
-- unit_number never conflicts (unique indexes treat NULLs as distinct).
--
-- Prod check before writing (2026-11-28): 22 units, 0 duplicate groups among
-- non-deleted units, 0 among all units, 0 numbers with surrounding spaces.
--
-- A refused write is SQLSTATE 23505 naming this index; the app turns it into
-- "This property already has a unit with that number."
-- (`UNIQUE_CONSTRAINT_MESSAGES` in src/lib/mutation-error-handler.ts).

create unique index units_property_unit_number_key
  on public.units (property_id, lower(btrim(unit_number)))
  where status <> 'inactive';
