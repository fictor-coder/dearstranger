-- HeartLeak: first database schema
-- Run this once in Supabase SQL Editor. It creates tables only; it does not delete data.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  anonymous_handle text not null unique check (char_length(anonymous_handle) between 3 and 32),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- This holds information that must never be public, including the user's private notes.
create table public.private_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  username text check (char_length(username) between 3 and 32),
  age smallint check (age between 13 and 100),
  gender text check (gender in ('female', 'male', 'nonbinary', 'unspecified')),
  bio text check (char_length(bio) <= 600),
  private_bio text check (char_length(private_bio) <= 1800),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  mood text not null check (mood in ('sad', 'calm', 'happy', 'loved', 'thoughtful', 'confused')),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  expires_at timestamptz,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);

create unique index connections_unique_pair
  on public.connections (least(requester_id, recipient_id), greatest(requester_id, recipient_id));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'message', 'profile')),
  target_id uuid not null,
  reason text not null check (char_length(trim(reason)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger private_profiles_set_updated_at
before update on public.private_profiles
for each row execute procedure public.set_updated_at();

create trigger posts_set_updated_at
before update on public.posts
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.private_profiles enable row level security;
alter table public.posts enable row level security;
alter table public.connections enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- Public anonymous handles can be read by signed-in HeartLeak users.
create policy "signed-in users can read public profiles"
on public.profiles for select to authenticated using (true);

create policy "users can create their own profile"
on public.profiles for insert to authenticated with check (id = auth.uid());

create policy "users can update their own profile"
on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "users can read their own private profile"
on public.private_profiles for select to authenticated using (id = auth.uid());

create policy "users can create their own private profile"
on public.private_profiles for insert to authenticated with check (id = auth.uid());

create policy "users can update their own private profile"
on public.private_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "signed-in users can read active posts"
on public.posts for select to authenticated
using (expires_at is null or expires_at > now() or author_id = auth.uid());

create policy "users can publish their own posts"
on public.posts for insert to authenticated with check (author_id = auth.uid());

create policy "users can edit their own posts"
on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "users can delete their own posts"
on public.posts for delete to authenticated using (author_id = auth.uid());

create policy "connection participants can read their connections"
on public.connections for select to authenticated
using (requester_id = auth.uid() or recipient_id = auth.uid());

create policy "users can send connection requests"
on public.connections for insert to authenticated with check (requester_id = auth.uid());

create policy "connection participants can update their connections"
on public.connections for update to authenticated
using (requester_id = auth.uid() or recipient_id = auth.uid())
with check (requester_id = auth.uid() or recipient_id = auth.uid());

create policy "connection participants can read messages"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.connections c
    where c.id = connection_id
      and c.status = 'accepted'
      and (c.requester_id = auth.uid() or c.recipient_id = auth.uid())
  )
);

create policy "connection participants can send messages"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.connections c
    where c.id = connection_id
      and c.status = 'accepted'
      and (c.requester_id = auth.uid() or c.recipient_id = auth.uid())
  )
);

create policy "users can read their own blocks"
on public.blocks for select to authenticated using (blocker_id = auth.uid());

create policy "users can block from their own account"
on public.blocks for insert to authenticated with check (blocker_id = auth.uid());

create policy "users can remove their own blocks"
on public.blocks for delete to authenticated using (blocker_id = auth.uid());

create policy "users can submit reports"
on public.reports for insert to authenticated with check (reporter_id = auth.uid());
