-- HeartLeak: profile, connection, block, and read-receipt fixes
-- Run this ONCE in Supabase SQL Editor. It does not delete existing data.

-- A separate table is used for the information a user chooses to share only
-- with mutual connections. Private thoughts remain in private_profiles.
create table if not exists public.connected_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  username text check (char_length(username) between 3 and 32),
  age smallint check (age between 13 and 100),
  gender text check (gender in ('female', 'male', 'nonbinary', 'unspecified')),
  bio text check (char_length(bio) <= 600),
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.connected_profiles enable row level security;

drop policy if exists "users can read their own connected profile" on public.connected_profiles;
drop policy if exists "mutual connections can read connected profiles" on public.connected_profiles;
drop policy if exists "users can create their own connected profile" on public.connected_profiles;
drop policy if exists "users can update their own connected profile" on public.connected_profiles;

create policy "users can read their own connected profile"
on public.connected_profiles for select to authenticated
using (id = auth.uid());

create policy "mutual connections can read connected profiles"
on public.connected_profiles for select to authenticated
using (
  exists (
    select 1 from public.connections c
    where c.status = 'accepted'
      and ((c.requester_id = auth.uid() and c.recipient_id = connected_profiles.id)
        or (c.recipient_id = auth.uid() and c.requester_id = connected_profiles.id))
  )
);

create policy "users can create their own connected profile"
on public.connected_profiles for insert to authenticated with check (id = auth.uid());

create policy "users can update their own connected profile"
on public.connected_profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

drop trigger if exists connected_profiles_set_updated_at on public.connected_profiles;
create trigger connected_profiles_set_updated_at
before update on public.connected_profiles
for each row execute procedure public.set_updated_at();

-- Read receipts start as NULL. They are set only when the recipient opens a chat.
alter table public.messages add column if not exists seen_at timestamptz;

create or replace function public.mark_connection_messages_seen(target_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.connections c
    where c.id = target_connection_id
      and c.status in ('pending', 'accepted')
      and (c.requester_id = auth.uid() or c.recipient_id = auth.uid())
  ) then
    raise exception 'Not allowed to open this conversation';
  end if;

  update public.messages
  set seen_at = now()
  where connection_id = target_connection_id
    and sender_id <> auth.uid()
    and seen_at is null;
end;
$$;

grant execute on function public.mark_connection_messages_seen(uuid) to authenticated;

-- Upsert attempts can become UPDATEs when a block already exists. This policy
-- prevents the RLS error shown in the screenshot while keeping ownership strict.
drop policy if exists "users can update their own blocks" on public.blocks;
create policy "users can update their own blocks"
on public.blocks for update to authenticated
using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
