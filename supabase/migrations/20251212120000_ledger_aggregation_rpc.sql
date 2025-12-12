-- Context: Week 1 Missing Database Indexes (PERFORMANCE_IMPROVEMENTS.md)
-- Adds ledger_aggregation RPC to eliminate N+1 queries in ledger helpers
-- Returns JSON arrays for flexibility with Supabase client

create or replace function public.ledger_aggregation()
returns json
language sql
security definer
set search_path = public
stable
as $$
    with props as (
        select * from properties
    ),
    units_cte as (
        select u.*
        from units u
        where u.property_id in (select id from props)
    ),
    leases_cte as (
        select l.*
        from leases l
        where l.unit_id in (select id from units_cte)
    ),
    payments_cte as (
        select rp.*
        from rent_payments rp
        where rp.lease_id in (select id from leases_cte)
    ),
    maint_cte as (
        select mr.*
        from maintenance_requests mr
        where mr.unit_id in (select id from units_cte)
    ),
    expenses_cte as (
        select e.*
        from expenses e
        where e.maintenance_request_id in (select id from maint_cte)
    )
    select json_build_object(
        'rent_payments', coalesce((select json_agg(p) from payments_cte p), '[]'::json),
        'expenses', coalesce((select json_agg(e) from expenses_cte e), '[]'::json),
        'leases', coalesce((select json_agg(l) from leases_cte l), '[]'::json),
        'maintenance_requests', coalesce((select json_agg(m) from maint_cte m), '[]'::json),
        'units', coalesce((select json_agg(u) from units_cte u), '[]'::json),
        'properties', coalesce((select json_agg(prop) from props prop), '[]'::json)
    );
$$;

comment on function public.ledger_aggregation() is
'Aggregates properties, units, leases, rent_payments, maintenance_requests, expenses into a single JSON payload to prevent N+1 queries from the API layer.';
