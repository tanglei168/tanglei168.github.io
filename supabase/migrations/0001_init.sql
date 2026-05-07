-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  provider text not null,
  created_at timestamptz not null default now()
);

-- auto-create profile on new user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar_url, provider)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_app_meta_data->>'provider', 'github')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_comments_post_slug on public.comments(post_slug, created_at desc);
create index idx_comments_parent on public.comments(parent_id);

-- rate limit: 3 comments per minute per user
create or replace function public.rate_limit_comments()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.comments
      where author_id = new.author_id and created_at > now() - interval '1 minute') >= 3 then
    raise exception 'Rate limit: max 3 comments per minute';
  end if;
  return new;
end;
$$;

create trigger comments_rate_limit
  before insert on public.comments
  for each row execute procedure public.rate_limit_comments();

-- RLS
alter table public.profiles enable row level security;
alter table public.comments enable row level security;

create policy "profiles_read_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "comments_read_all" on public.comments for select using (is_deleted = false);
create policy "comments_insert_authed" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments_update_own" on public.comments for update using (auth.uid() = author_id);
