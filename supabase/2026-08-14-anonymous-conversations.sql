-- HeartLeak: anonymous conversations and connection requests
-- Run this ONCE in Supabase SQL Editor. It only adds columns and replaces
-- policies; it does not delete accounts, profiles, posts, or messages.

alter table public.connections
  add column if not exists post_id uuid references public.posts(id) on delete set null,
  add column if not exists friend_requested_by uuid references public.profiles(id) on delete set null;

alter table public.messages
  add column if not exists deleted_at timestamptz;

create index if not exists connections_post_id_idx on public.connections(post_id);
create index if not exists messages_connection_created_at_idx on public.messages(connection_id, created_at);

-- A connection begins as an anonymous conversation. It becomes an accepted
-- connection only after one participant asks to connect and the other accepts.
drop policy if exists "users can send connection requests" on public.connections;
drop policy if exists "connection participants can update their connections" on public.connections;

create policy "users can start conversations on active posts"
on public.connections for insert to authenticated
with check (
  requester_id = auth.uid()
  and requester_id <> recipient_id
  and friend_requested_by is null
  and exists (
    select 1 from public.posts p
    where p.id = post_id
      and p.author_id = recipient_id
      and (p.expires_at is null or p.expires_at > now())
  )
);

create policy "participants can manage their conversations"
on public.connections for update to authenticated
using (requester_id = auth.uid() or recipient_id = auth.uid())
with check (
  requester_id = auth.uid() or recipient_id = auth.uid()
);

-- Both people in an anonymous conversation may read and send messages. This
-- does not make either identity or any conversation visible to other users.
drop policy if exists "connection participants can read messages" on public.messages;
drop policy if exists "connection participants can send messages" on public.messages;

create policy "conversation participants can read messages"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.connections c
    where c.id = connection_id
      and c.status in ('pending', 'accepted')
      and (c.requester_id = auth.uid() or c.recipient_id = auth.uid())
  )
);

create policy "conversation participants can send messages"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.connections c
    where c.id = connection_id
      and c.status in ('pending', 'accepted')
      and (c.requester_id = auth.uid() or c.recipient_id = auth.uid())
  )
);

create policy "users can edit their own messages"
on public.messages for update to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());
