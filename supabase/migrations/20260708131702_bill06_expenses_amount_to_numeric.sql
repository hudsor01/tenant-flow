-- BILL-06: expenses.amount was integer (rounded cents on insert), contradicting the
-- dollars-as-numeric(10,2) money model. Convert to numeric(10,2). Prod expenses is
-- empty (0 rows) so this is lossless — no data conversion.
ALTER TABLE public.expenses ALTER COLUMN amount TYPE numeric(10,2);
COMMENT ON COLUMN public.expenses.amount IS 'Expense amount in DOLLARS (numeric(10,2)); converted from integer in BILL-06.';
