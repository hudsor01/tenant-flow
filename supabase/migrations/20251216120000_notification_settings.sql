-- Notification settings per user for owner dashboard toggles
-- Provides persisted channels + category preferences instead of static UI state.

create table if not exists public.notification_settings (
    id uuid default extensions.uuid_generate_v4() primary key,
    user_id uuid not null,
    email boolean not null default true,
    sms boolean not null default false,
    push boolean not null default true,
    in_app boolean not null default true,
    maintenance boolean not null default true,
    leases boolean not null default true,
    general boolean not null default true,
    version integer not null default 1,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint notification_settings_user_unique unique (user_id),
    constraint notification_settings_user_fk foreign key (user_id) references public.users(id) on delete cascade
);

alter table public.notification_settings enable row level security;

create policy "notification_settings_select_own"
    on public.notification_settings
    for select
    using (user_id = auth.uid());

create policy "notification_settings_insert_own"
    on public.notification_settings
    for insert
    with check (user_id = auth.uid());

create policy "notification_settings_update_own"
    on public.notification_settings
    for update
    using (user_id = auth.uid());

create policy "notification_settings_delete_own"
    on public.notification_settings
    for delete
    using (user_id = auth.uid());

create index if not exists idx_notification_settings_user
    on public.notification_settings (user_id);

create trigger set_notification_settings_updated_at
    before update on public.notification_settings
    for each row
    execute function public.set_updated_at();
