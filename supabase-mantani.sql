-- =========================================================
--  Project Mantani — дополнительные таблицы
--  Запускать в том же проекте Supabase, что и DSV-Zombi
--  (SQL Editor -> New query -> вставить всё -> Run).
--  Файл идемпотентный — можно запускать повторно.
-- =========================================================

-- ---------- Таблицы ----------

-- Механики (редактируемый раздел «Механики выживания»)
create table if not exists public.mantani_mechanics (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

-- Новости (редактируемый раздел «Новости сектора»)
create table if not exists public.mantani_news (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text not null,
  author        text,
  author_avatar text,
  created_at    timestamptz not null default now()
);

-- Профили Project Mantani (аватар и «о себе»), ключ = id пользователя Supabase
create table if not exists public.mantani_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  avatar     text,
  bio        text,
  updated_at timestamptz not null default now()
);

-- ---------- Доступ (RLS) ----------

alter table public.mantani_mechanics enable row level security;
alter table public.mantani_news      enable row level security;
alter table public.mantani_profiles  enable row level security;

-- Чтение контента — всем (в т.ч. неавторизованным посетителям)
drop policy if exists "mantani_mechanics_read" on public.mantani_mechanics;
create policy "mantani_mechanics_read" on public.mantani_mechanics
  for select to anon, authenticated using (true);

drop policy if exists "mantani_news_read" on public.mantani_news;
create policy "mantani_news_read" on public.mantani_news
  for select to anon, authenticated using (true);

drop policy if exists "mantani_profiles_read" on public.mantani_profiles;
create policy "mantani_profiles_read" on public.mantani_profiles
  for select to anon, authenticated using (true);

-- Запись контента — только основателю и админам
drop policy if exists "mantani_mechanics_write" on public.mantani_mechanics;
create policy "mantani_mechanics_write" on public.mantani_mechanics
  for all to authenticated
  using   (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('founder','admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('founder','admin')));

drop policy if exists "mantani_news_write" on public.mantani_news;
create policy "mantani_news_write" on public.mantani_news
  for all to authenticated
  using   (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('founder','admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('founder','admin')));

-- Свой профиль (аватар/био) — каждый редактирует только себя
drop policy if exists "mantani_profiles_write" on public.mantani_profiles;
create policy "mantani_profiles_write" on public.mantani_profiles
  for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Готово.
