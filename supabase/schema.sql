-- =============================================================================
-- Jeanity — Supabase schema (single source of truth)
-- =============================================================================
-- Run: Dashboard → SQL Editor → paste → Run. Safe to re-run (IF NOT EXISTS,
-- DROP POLICY IF EXISTS, ON CONFLICT). All SQL for this project lives in this file.
--
-- After changing functions exposed to PostgREST: wait ~1 min or Dashboard →
-- Project Settings → API → reload schema if `rpc/get_ranked_feed_posts` 404s.
--
-- Contents:  Storage · Profiles · Follows · Feed (+ likes, ranking RPC) · Product
--            · Channels · Spaces · Space members · Messages · Reactions · Legacy patches
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Storage (buckets + RLS on storage.objects)
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 524288, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('space_icons', 'space_icons', true, 1048576, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('post_images', 'post_images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- avatars: folder name = auth.uid()
drop policy if exists "Avatar images are publicly readable" on storage.objects;
drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;
drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select to public using (bucket_id = 'avatars');
create policy "Users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- space_icons, post_images: public read; write only in own uid folder
drop policy if exists "Space icons are publicly readable" on storage.objects;
drop policy if exists "Users can upload space icons" on storage.objects;
drop policy if exists "Users can update own space icons" on storage.objects;
drop policy if exists "Users can delete own space icons" on storage.objects;
drop policy if exists "Post images are publicly readable" on storage.objects;
drop policy if exists "Users can upload post images" on storage.objects;
drop policy if exists "Users can update own post images" on storage.objects;
drop policy if exists "Users can delete own post images" on storage.objects;
create policy "Space icons are publicly readable"
  on storage.objects for select to public using (bucket_id = 'space_icons');
create policy "Users can upload space icons"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'space_icons' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update own space icons"
  on storage.objects for update to authenticated
  using (bucket_id = 'space_icons' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'space_icons' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete own space icons"
  on storage.objects for delete to authenticated
  using (bucket_id = 'space_icons' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Post images are publicly readable"
  on storage.objects for select to public using (bucket_id = 'post_images');
create policy "Users can upload post images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post_images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update own post images"
  on storage.objects for update to authenticated
  using (bucket_id = 'post_images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'post_images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete own post images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post_images' and (storage.foldername(name))[1] = auth.uid()::text);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Profiles (synced from auth.users)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sign-up interests (mirrors auth raw_user_meta_data.interest_categories JSON array)
alter table public.profiles
  add column if not exists interest_categories text[] not null default '{}'::text[];

alter table public.profiles enable row level security;
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select to public using (true);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cats text[];
begin
  cats := array(
    select jsonb_array_elements_text(
      coalesce(new.raw_user_meta_data->'interest_categories', '[]'::jsonb)
    )
  );

  insert into public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    bio,
    interest_categories,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar',
    new.raw_user_meta_data->>'bio',
    cats,
    now()
  )
  on conflict (id) do update set
    username = coalesce(excluded.username, profiles.username),
    display_name = coalesce(excluded.display_name, profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    bio = coalesce(excluded.bio, profiles.bio),
    interest_categories = case
      when new.raw_user_meta_data ? 'interest_categories' then excluded.interest_categories
      else profiles.interest_categories
    end,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles in sync when auth metadata changes (e.g. OTP signup then updateUser with categories)
create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cats text[];
begin
  if new.raw_user_meta_data is distinct from old.raw_user_meta_data then
    cats := array(
      select jsonb_array_elements_text(
        coalesce(new.raw_user_meta_data->'interest_categories', '[]'::jsonb)
      )
    );
    update public.profiles
    set
      username = coalesce(new.raw_user_meta_data->>'username', profiles.username),
      display_name = coalesce(
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'full_name',
        profiles.display_name
      ),
      avatar_url = coalesce(new.raw_user_meta_data->>'avatar', profiles.avatar_url),
      bio = coalesce(new.raw_user_meta_data->>'bio', profiles.bio),
      interest_categories = case
        when new.raw_user_meta_data ? 'interest_categories' then cats
        else profiles.interest_categories
      end,
      updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_auth_user_updated();


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Follows
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id != following_id)
);
create index if not exists follows_follower_idx on public.follows (follower_id);
create index if not exists follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;
drop policy if exists "Follows are readable by authenticated" on public.follows;
create policy "Follows are readable by authenticated"
  on public.follows for select to authenticated using (true);
drop policy if exists "Users can follow" on public.follows;
create policy "Users can follow"
  on public.follows for insert to authenticated with check (auth.uid() = follower_id);
drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow"
  on public.follows for delete to authenticated using (auth.uid() = follower_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Feed posts & comments
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  author_tag text not null,
  avatar_url text,
  avatar_emoji text,
  caption text not null,
  image_url text,
  surface text,
  launch_name text,
  launch_categories text[],
  launch_logo_url text,
  comments_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists feed_posts_created_at_idx on public.feed_posts (created_at desc);
alter table public.feed_posts add column if not exists comments_count int not null default 0;

create table if not exists public.feed_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  author_tag text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists feed_post_comments_post_id_created_idx
  on public.feed_post_comments (post_id, created_at);

create or replace function public.bump_feed_post_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.feed_posts set comments_count = comments_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.feed_posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;
drop trigger if exists feed_post_comments_count_ins on public.feed_post_comments;
drop trigger if exists feed_post_comments_count_del on public.feed_post_comments;
drop trigger if exists feed_post_comments_count on public.feed_post_comments;
create trigger feed_post_comments_count
  after insert or delete on public.feed_post_comments
  for each row execute function public.bump_feed_post_comments_count();

alter table public.feed_post_comments enable row level security;
drop policy if exists "Feed post comments are readable by everyone" on public.feed_post_comments;
create policy "Feed post comments are readable by everyone"
  on public.feed_post_comments for select to public using (true);
drop policy if exists "Authenticated users can insert feed post comments" on public.feed_post_comments;
create policy "Authenticated users can insert feed post comments"
  on public.feed_post_comments for insert to authenticated with check (true);

alter table public.feed_posts enable row level security;
drop policy if exists "Feed posts are readable by everyone" on public.feed_posts;
create policy "Feed posts are readable by everyone"
  on public.feed_posts for select to public using (true);
drop policy if exists "Authenticated users can create feed posts" on public.feed_posts;
create policy "Authenticated users can create feed posts"
  on public.feed_posts for insert to authenticated with check (auth.uid() = user_id);

-- Likes (counter on row), optional post tags for relevance, editorial featured flag
alter table public.feed_posts add column if not exists likes_count int not null default 0;
alter table public.feed_posts add column if not exists post_tags text[] not null default '{}'::text[];
alter table public.feed_posts add column if not exists is_featured boolean not null default false;

create table if not exists public.feed_post_likes (
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists feed_post_likes_user_idx on public.feed_post_likes (user_id);
create index if not exists feed_post_likes_post_idx on public.feed_post_likes (post_id);

alter table public.feed_post_likes enable row level security;
drop policy if exists "Feed post likes are readable when authenticated" on public.feed_post_likes;
create policy "Feed post likes are readable when authenticated"
  on public.feed_post_likes for select to authenticated using (true);
drop policy if exists "Users can like posts" on public.feed_post_likes;
create policy "Users can like posts"
  on public.feed_post_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can unlike posts" on public.feed_post_likes;
create policy "Users can unlike posts"
  on public.feed_post_likes for delete to authenticated using (auth.uid() = user_id);

create or replace function public.bump_feed_post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.feed_posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.feed_posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists feed_post_likes_count_ins on public.feed_post_likes;
drop trigger if exists feed_post_likes_count_del on public.feed_post_likes;
create trigger feed_post_likes_count_ins
  after insert on public.feed_post_likes
  for each row execute function public.bump_feed_post_likes_count();
create trigger feed_post_likes_count_del
  after delete on public.feed_post_likes
  for each row execute function public.bump_feed_post_likes_count();


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Product (ranking) & product comments
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.product (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  author_tag text not null,
  name text not null,
  tagline text not null default '',
  categories text[] not null default '{}',
  logo_url text,
  upvotes int not null default 0,
  comments_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_created_at_idx on public.product (created_at desc);
create index if not exists product_user_id_idx on public.product (user_id);
alter table public.product add column if not exists comments_count int not null default 0;

create table if not exists public.product_comment (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  author_tag text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists product_comment_product_id_created_idx
  on public.product_comment (product_id, created_at);

create or replace function public.bump_product_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.product set comments_count = comments_count + 1 where id = new.product_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.product set comments_count = greatest(0, comments_count - 1) where id = old.product_id;
    return old;
  end if;
  return null;
end;
$$;
drop trigger if exists product_comment_count on public.product_comment;
create trigger product_comment_count
  after insert or delete on public.product_comment
  for each row execute function public.bump_product_comments_count();

alter table public.product enable row level security;
drop policy if exists "Products are readable by everyone" on public.product;
create policy "Products are readable by everyone"
  on public.product for select to public using (true);
drop policy if exists "Authenticated users can create products" on public.product;
create policy "Authenticated users can create products"
  on public.product for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own products" on public.product;
create policy "Users can update own products"
  on public.product for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.product_comment enable row level security;
drop policy if exists "Product comments are readable by everyone" on public.product_comment;
create policy "Product comments are readable by everyone"
  on public.product_comment for select to public using (true);
drop policy if exists "Authenticated users can insert product comments" on public.product_comment;
create policy "Authenticated users can insert product comments"
  on public.product_comment for insert to authenticated with check (true);

-- Optional one-time: migrate Launch rows from feed_posts into product
-- insert into public.product (user_id, author_name, author_tag, name, tagline, categories, logo_url, created_at)
-- select user_id, author_name, author_tag, launch_name, caption, coalesce(launch_categories, '{}'), launch_logo_url, created_at
-- from public.feed_posts where surface = 'Launch' and launch_name is not null;


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Channels (+ seed)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.channels enable row level security;
drop policy if exists "Channels are readable by authenticated users" on public.channels;
create policy "Channels are readable by authenticated users"
  on public.channels for select to authenticated using (true);

insert into public.channels (slug, name, description, sort_order)
values ('general', 'general', 'Design, builds, and what’s shipping on Jeanity', 1)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Spaces
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  icon_url text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists spaces_code_idx on public.spaces (code);

alter table public.spaces enable row level security;
drop policy if exists "Spaces are readable by authenticated users" on public.spaces;
create policy "Spaces are readable by authenticated users"
  on public.spaces for select to authenticated using (true);
drop policy if exists "Authenticated users can create spaces" on public.spaces;
create policy "Authenticated users can create spaces"
  on public.spaces for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "Users can update own spaces" on public.spaces;
create policy "Users can update own spaces"
  on public.spaces for update to authenticated
  using (auth.uid() = created_by) with check (auth.uid() = created_by);


-- 7b. Space members (invites + roster). Roster policy must not subquery space_members
--     directly (that re-enters RLS → recursion / HTTP 500). Use SECURITY DEFINER helper.

create table if not exists public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index if not exists space_members_user_id_idx on public.space_members (user_id);

create or replace function public.current_user_is_space_member(_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.space_members sm
    where sm.space_id = _space_id and sm.user_id = auth.uid()
  );
$$;

revoke all on function public.current_user_is_space_member(uuid) from public;
grant execute on function public.current_user_is_space_member(uuid) to authenticated;
grant execute on function public.current_user_is_space_member(uuid) to service_role;

alter table public.space_members enable row level security;

drop policy if exists "Users read own space memberships" on public.space_members;
create policy "Users read own space memberships"
  on public.space_members for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Members see roster for their spaces" on public.space_members;
create policy "Members see roster for their spaces"
  on public.space_members for select to authenticated
  using (
    public.current_user_is_space_member(space_id)
    or exists (
      select 1 from public.spaces s
      where s.id = space_members.space_id and s.created_by = auth.uid()
    )
  );

drop policy if exists "Users can join spaces" on public.space_members;
create policy "Users can join spaces"
  on public.space_members for insert to authenticated
  with check (auth.uid() = user_id);

insert into public.space_members (space_id, user_id)
select id, created_by from public.spaces where created_by is not null
on conflict do nothing;


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Messages
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null,
  space_id uuid references public.spaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  body text,
  attachment_url text,
  attachment_name text,
  parent_id uuid references public.messages (id) on delete cascade,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists messages_channel_created_idx on public.messages (channel_id, created_at);
create index if not exists messages_parent_idx on public.messages (parent_id) where parent_id is not null;

alter table public.messages enable row level security;
drop policy if exists "Messages are readable by authenticated users" on public.messages;
create policy "Messages are readable by authenticated users"
  on public.messages for select to authenticated using (true);
drop policy if exists "Users can insert own messages" on public.messages;
create policy "Users can insert own messages"
  on public.messages for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own messages" on public.messages;
create policy "Users can update own messages"
  on public.messages for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 9. Message reactions
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);
create index if not exists message_reactions_message_idx on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;
drop policy if exists "Reactions are readable by authenticated users" on public.message_reactions;
create policy "Reactions are readable by authenticated users"
  on public.message_reactions for select to authenticated using (true);
drop policy if exists "Users can add own reaction" on public.message_reactions;
create policy "Users can add own reaction"
  on public.message_reactions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can remove own reaction" on public.message_reactions;
create policy "Users can remove own reaction"
  on public.message_reactions for delete to authenticated using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 10. Personalized feed ranking (cold-start + cursor pagination)
-- ═══════════════════════════════════════════════════════════════════════════
-- Score = (0.5 * freshness + 0.3 * engagement + 0.2 * relevance) * boost_product
-- Freshness: exp decay on age (hours), tau ~ 36h
-- Engagement: 3*comments + likes, normalized via soft cap
-- Relevance: Jaccard(user interests, post_tags ∪ launch_categories) + large follow boost
-- Boosts: first post, has ≥1 comment, featured, short-window trending

create or replace function public._feed_tag_jaccard(
  p_post_tags text[],
  p_launch_categories text[],
  p_viewer_interests text[]
)
returns double precision
language plpgsql
immutable
set search_path = public
as $$
declare
  a text[];
  b text[];
  inter_c int;
  uni_c int;
begin
  select coalesce(array_agg(distinct lower(trim(t))), '{}')
  into a
  from unnest(coalesce(p_post_tags, '{}') || coalesce(p_launch_categories, '{}')) as u(t)
  where t is not null and length(trim(t)) > 0;

  select coalesce(array_agg(distinct lower(trim(t))), '{}')
  into b
  from unnest(coalesce(p_viewer_interests, '{}')) as u(t)
  where t is not null and length(trim(t)) > 0;

  select count(*) into inter_c from unnest(a) x where x = any (b);
  select count(*) into uni_c from (select distinct unnest(a || b) x) s;
  if uni_c = 0 then
    return 0::double precision;
  end if;
  return (inter_c::double precision / uni_c::double precision);
end;
$$;

create or replace function public.get_ranked_feed_posts(
  p_viewer_id uuid,
  p_limit int default 30,
  p_cursor_score double precision default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  id uuid,
  user_id uuid,
  author_name text,
  author_tag text,
  avatar_url text,
  avatar_emoji text,
  caption text,
  image_url text,
  surface text,
  launch_name text,
  launch_categories text[],
  launch_logo_url text,
  comments_count int,
  likes_count int,
  post_tags text[],
  is_featured boolean,
  created_at timestamptz,
  rank_score double precision
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_interests text[];
  lim int := greatest(1, least(coalesce(p_limit, 30), 100));
begin
  select coalesce(pr.interest_categories, '{}'::text[])
  into v_interests
  from public.profiles pr
  where pr.id = p_viewer_id;

  if v_interests is null then
    v_interests := '{}'::text[];
  end if;

  return query
  with
  following_ids as (
    select f.following_id
    from public.follows f
    where p_viewer_id is not null and f.follower_id = p_viewer_id
  ),
  base as (
    select
      fp.id,
      fp.user_id,
      fp.author_name,
      fp.author_tag,
      fp.avatar_url,
      fp.avatar_emoji,
      fp.caption,
      fp.image_url,
      fp.surface,
      fp.launch_name,
      fp.launch_categories,
      fp.launch_logo_url,
      fp.comments_count,
      fp.likes_count,
      fp.post_tags,
      fp.is_featured,
      fp.created_at,
      greatest(0.001, extract(epoch from (now() - fp.created_at)) / 3600.0) as age_h,
      (3 * coalesce(fp.comments_count, 0) + coalesce(fp.likes_count, 0))::double precision as eng_raw,
      exists (select 1 from following_ids fi where fi.following_id = fp.user_id) as is_followed,
      not exists (
        select 1 from public.feed_posts older
        where older.user_id is not distinct from fp.user_id
          and older.created_at < fp.created_at
      ) as is_first_post
    from public.feed_posts fp
    where fp.created_at > now() - interval '150 days'
      and (fp.surface is null or fp.surface not in ('Launch', 'Story'))
  ),
  scored as (
    select
      b.*,
      exp(-least(b.age_h / 36.0, 14.0)) as freshness_score,
      (b.eng_raw / (b.eng_raw + 14.0)) as engagement_score,
      least(
        1.0::double precision,
        public._feed_tag_jaccard(b.post_tags, b.launch_categories, v_interests)
        + case when b.is_followed then 0.62::double precision else 0::double precision end
        + case
            when p_viewer_id is null then 0.12::double precision
            else 0.08::double precision
          end
      ) as relevance_score,
      (
        (3 * coalesce(b.comments_count, 0) + coalesce(b.likes_count, 0))::double precision
        / power(greatest(b.age_h, 0.35), 1.18)
      ) as velocity_score
    from base b
  ),
  final as (
    select
      s.id,
      s.user_id,
      s.author_name,
      s.author_tag,
      s.avatar_url,
      s.avatar_emoji,
      s.caption,
      s.image_url,
      s.surface,
      s.launch_name,
      s.launch_categories,
      s.launch_logo_url,
      s.comments_count,
      s.likes_count,
      s.post_tags,
      s.is_featured,
      s.created_at,
      s.eng_raw,
      s.velocity_score,
      (
        (0.5::double precision * s.freshness_score)
        + (0.3::double precision * s.engagement_score)
        + (0.2::double precision * s.relevance_score)
      )
      * (case when s.is_first_post then 1.22::double precision else 1.0::double precision end)
      * (case when coalesce(s.comments_count, 0) >= 1 then 1.07::double precision else 1.0::double precision end)
      * (case when s.is_featured then 1.34::double precision else 1.0::double precision end)
      * (
          case
            when s.created_at > now() - interval '48 hours'
              and s.eng_raw >= 2.5
              and s.velocity_score >= 1.05
            then 1.14::double precision
            else 1.0::double precision
          end
        ) as rank_score
    from scored s
  ),
  windowed as (
    select f.*,
      row_number() over (
        order by f.rank_score desc, f.created_at desc, f.id desc
      ) as rn
    from final f
    where
      p_cursor_id is null
      or (
        f.rank_score < p_cursor_score
        or (
          f.rank_score = p_cursor_score
          and (
            f.created_at < p_cursor_created_at
            or (f.created_at = p_cursor_created_at and f.id < p_cursor_id)
          )
        )
      )
  ),
  primary_rows as (
    select * from windowed where rn <= lim
  ),
  deficit as (
    select greatest(0, lim - (select count(*)::int from primary_rows pcount)) as n
  ),
  trending_pool as (
    select f.*
    from final f
    where f.id not in (select px.id from primary_rows px)
      and f.created_at > now() - interval '72 hours'
      and f.eng_raw >= 1
    order by f.velocity_score desc, f.created_at desc
    limit (select d.n from deficit d)
  ),
  deficit2 as (
    select greatest(0, (select d1.n from deficit d1) - (select count(*)::int from trending_pool)) as n
  ),
  random_pool as (
    select f.*
    from final f
    where f.id not in (select px.id from primary_rows px)
      and f.id not in (select tx.id from trending_pool tx)
    order by random()
    limit (select d2.n from deficit2 d2)
  )
  select
    pr.id,
    pr.user_id,
    pr.author_name,
    pr.author_tag,
    pr.avatar_url,
    pr.avatar_emoji,
    pr.caption,
    pr.image_url,
    pr.surface,
    pr.launch_name,
    pr.launch_categories,
    pr.launch_logo_url,
    pr.comments_count,
    pr.likes_count,
    pr.post_tags,
    pr.is_featured,
    pr.created_at,
    pr.rank_score
  from primary_rows pr
  union all
  select
    tp.id,
    tp.user_id,
    tp.author_name,
    tp.author_tag,
    tp.avatar_url,
    tp.avatar_emoji,
    tp.caption,
    tp.image_url,
    tp.surface,
    tp.launch_name,
    tp.launch_categories,
    tp.launch_logo_url,
    tp.comments_count,
    tp.likes_count,
    tp.post_tags,
    tp.is_featured,
    tp.created_at,
    tp.rank_score
  from trending_pool tp
  union all
  select
    rp.id,
    rp.user_id,
    rp.author_name,
    rp.author_tag,
    rp.avatar_url,
    rp.avatar_emoji,
    rp.caption,
    rp.image_url,
    rp.surface,
    rp.launch_name,
    rp.launch_categories,
    rp.launch_logo_url,
    rp.comments_count,
    rp.likes_count,
    rp.post_tags,
    rp.is_featured,
    rp.created_at,
    rp.rank_score
  from random_pool rp;

end;
$$;

grant execute on function public._feed_tag_jaccard(text[], text[], text[]) to anon, authenticated;
grant execute on function public.get_ranked_feed_posts(uuid, int, double precision, timestamptz, uuid) to anon, authenticated;
-- If the ranked-feed RPC still 404s in the app after this file succeeds, wait ~1 min
-- or use Supabase Dashboard → Project Settings → API → reload schema cache.


-- ═══════════════════════════════════════════════════════════════════════════
-- 11. Legacy patches (old DBs only)
-- ═══════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'spaces' and column_name = 'icon_url'
  ) then
    alter table public.spaces add column icon_url text;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'text'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'body'
  ) then
    alter table public.messages rename column text to body;
  end if;

  alter table public.messages add column if not exists edited_at timestamptz;
  alter table public.messages add column if not exists deleted_at timestamptz;
  alter table public.messages add column if not exists parent_id uuid references public.messages (id) on delete cascade;
  alter table public.messages add column if not exists updated_at timestamptz not null default now();
  alter table public.messages add column if not exists space_id uuid references public.spaces (id) on delete cascade;
end $$;
