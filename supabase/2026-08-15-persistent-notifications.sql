-- HeartLeak: durable Alerts for friend requests and accepted connections.
-- Safe to run once. It creates new notification records only for future events.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.connections(id) on delete cascade,
  type text not null check (type in ('friend_request', 'connection_accepted')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (recipient_id, connection_id, type)
);

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);

alter table public.notifications enable row level security;

create policy "users can read their own notifications"
on public.notifications for select to authenticated
using (recipient_id = auth.uid());

create policy "users can mark their own notifications read"
on public.notifications for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

create or replace function public.create_heartleak_connection_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending'
    and new.friend_requested_by is not null
    and new.friend_requested_by is distinct from old.friend_requested_by then
    insert into public.notifications (recipient_id, connection_id, type)
    values (
      case when new.friend_requested_by = new.requester_id then new.recipient_id else new.requester_id end,
      new.id,
      'friend_request'
    )
    on conflict (recipient_id, connection_id, type) do update
      set created_at = excluded.created_at,
          read_at = null;
  end if;

  if new.status = 'accepted' and old.status is distinct from 'accepted'
    and new.friend_requested_by is not null then
    insert into public.notifications (recipient_id, connection_id, type)
    values (new.friend_requested_by, new.id, 'connection_accepted')
    on conflict (recipient_id, connection_id, type) do update
      set created_at = excluded.created_at,
          read_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists heartleak_connection_notifications on public.connections;
create trigger heartleak_connection_notifications
after update of friend_requested_by, status on public.connections
for each row execute function public.create_heartleak_connection_notifications();
