-- Hofino – Initiales Schema (M2). Alle Geldbeträge in Cent (bigint). RLS auf allen Tabellen.
-- Rollen: child, parent, teacher, student, adult. Siehe DATA_MODEL.md / CLAUDE.md §3.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────
create type user_role as enum ('child', 'parent', 'teacher', 'student', 'adult');
create type instrument_type as enum ('stock', 'etf');
create type order_side as enum ('buy', 'sell');

-- ─────────────────────────────────────────────────────────────────────────────
-- Stammdaten / Profile
-- ─────────────────────────────────────────────────────────────────────────────
create table profiles (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  role         user_role not null,
  display_name text not null, -- kein Klarname erzwungen
  age_band     text,          -- z. B. '10-12', '13-15'
  created_at   timestamptz not null default now(),
  unique (auth_user_id)
);

create table parent_child_links (
  parent_profile_id uuid references profiles (id) on delete cascade,
  child_profile_id  uuid references profiles (id) on delete cascade,
  status            text not null default 'pending', -- pending | approved
  primary key (parent_profile_id, child_profile_id)
);

create table classes (
  id                 uuid primary key default gen_random_uuid(),
  teacher_profile_id uuid not null references profiles (id) on delete cascade,
  name               text not null,
  class_code         text not null unique,
  season_start       date,
  season_end         date,
  created_at         timestamptz not null default now()
);

create table class_members (
  class_id         uuid references classes (id) on delete cascade,
  child_profile_id uuid references profiles (id) on delete cascade,
  primary key (class_id, child_profile_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Instrumente & Kurse
-- ─────────────────────────────────────────────────────────────────────────────
create table instruments (
  id      uuid primary key default gen_random_uuid(),
  type    instrument_type not null,
  name    text not null,
  ticker  text,
  isin    text,
  wkn     text,
  sector  text,
  country text
);

create table price_snapshots (
  instrument_id uuid not null references instruments (id) on delete cascade,
  price_cents   bigint not null check (price_cents >= 0),
  as_of         timestamptz not null,
  primary key (instrument_id, as_of)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Depot
-- ─────────────────────────────────────────────────────────────────────────────
create table portfolios (
  id               uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null unique references profiles (id) on delete cascade,
  cash_cents       bigint not null default 500000, -- 5.000 € Startkapital
  created_at       timestamptz not null default now()
);

create table holdings (
  portfolio_id   uuid references portfolios (id) on delete cascade,
  instrument_id  uuid references instruments (id) on delete cascade,
  quantity       integer not null check (quantity >= 0), -- ganze Stücke
  avg_cost_cents bigint not null,
  primary key (portfolio_id, instrument_id)
);

create table orders (
  id            uuid primary key default gen_random_uuid(),
  portfolio_id  uuid not null references portfolios (id) on delete cascade,
  instrument_id uuid not null references instruments (id),
  side          order_side not null,
  quantity      integer not null check (quantity > 0),
  price_cents   bigint not null,
  fee_cents     bigint not null default 500, -- 5 € pro Order
  executed_at   timestamptz not null default now()
);

create table watchlist (
  profile_id    uuid references profiles (id) on delete cascade,
  instrument_id uuid references instruments (id) on delete cascade,
  primary key (profile_id, instrument_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Lernen & Belohnungen
-- ─────────────────────────────────────────────────────────────────────────────
create table learning_progress (
  profile_id   uuid references profiles (id) on delete cascade,
  module_id    text not null, -- referenziert packages/content
  completed_at timestamptz,
  quiz_score   integer check (quiz_score between 0 and 100),
  perfect      boolean not null default false,
  primary key (profile_id, module_id)
);

-- erzwingt „Lernkapital je Ereignis nur einmal"
create table capital_grants (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles (id) on delete cascade,
  reason       text not null, -- module_done | quiz_perfect | themenblock | milestone
  ref_id       text not null,
  amount_cents bigint not null,
  granted_at   timestamptz not null default now(),
  unique (profile_id, reason, ref_id)
);

create table knowledge_points (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  points     integer not null,
  source     text not null,
  ref_id     text not null,
  created_at timestamptz not null default now(),
  unique (profile_id, source, ref_id)
);

create table house_state (
  profile_id       uuid primary key references profiles (id) on delete cascade,
  stage            text not null default 'grundstueck',
  unlocked_objects jsonb not null default '[]'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Challenges & Rankings
-- ─────────────────────────────────────────────────────────────────────────────
create table challenges (
  id          uuid primary key default gen_random_uuid(),
  scope       text not null,            -- learn | depot | family | class
  title       text not null,
  description text,
  class_id    uuid references classes (id) on delete cascade,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table challenge_participation (
  challenge_id uuid references challenges (id) on delete cascade,
  profile_id   uuid references profiles (id) on delete cascade,
  progress     jsonb not null default '{}',
  completed_at timestamptz,
  primary key (challenge_id, profile_id)
);

-- Serverseitig berechnete Ranglisten-Snapshots (nie im Client berechnen).
create table rankings (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,  -- performance | total_capital | knowledge
  scope       text not null,  -- global | class | family
  scope_ref   uuid,           -- z. B. class_id (NULL bei global)
  profile_id  uuid not null references profiles (id) on delete cascade,
  score       double precision not null,
  rank        integer not null,
  computed_at timestamptz not null default now()
);

create index rankings_lookup on rankings (kind, scope, scope_ref, rank);
