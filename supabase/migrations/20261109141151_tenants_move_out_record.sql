-- Move-out record on tenants. The "Mark as moved out" dialog asks for a date
-- and a reason (optional notes are appended to the reason); until now neither
-- was stored, only logged in the browser.
alter table public.tenants
  add column move_out_date date,
  add column move_out_reason text;

alter table public.tenants
  add constraint tenants_move_out_reason_length_check
  check (move_out_reason is null or char_length(move_out_reason) <= 2000);

comment on column public.tenants.move_out_date is
  'Date the tenant moved out, from the Mark as moved out dialog (a local calendar date).';
comment on column public.tenants.move_out_reason is
  'Reason slug from the Mark as moved out dialog, with any notes appended after ": ".';
