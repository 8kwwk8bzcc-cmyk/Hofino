# DATA_MODEL.md – Hofino (Supabase / Postgres)

Alle Geldbeträge als **Cent (bigint)**. Alle Tabellen mit aktiviertem **RLS**.
Auth-Nutzer kommen aus `auth.users` (Supabase Auth); fachliche Rollen über `profiles.role`.

## 1. Rollen & Sichtbarkeits-Matrix

| Wer | darf sehen | darf NICHT |
|---|---|---|
| **child** | eigenes Depot, eigene Orders, eigener Lernfortschritt, eigenes Haus, eigene Wunschliste | fremde Daten, Elterndaten |
| **parent** | Lernfortschritt + Depot**entwicklung** der verknüpften Kinder | Depot manipulieren, fremde Familien |
| **teacher** | **Aggregate** der eigenen Klasse: Lernfortschritt, Wissenspunkte, Quiz-Ergebnisse, Klassenrankings, grobe Depotkennzahlen | volle Order-Historie einzelner Kinder, private Familieninfos |
| **student** | technisch = child, zusätzlich Mitglied in genau einer Klasse | – |
| **adult** | eigenes Depot/Orders/Lernfortschritt (wie child, ohne Haus-System); kann zusätzlich als Elternteil ein Kind verknüpfen | fremde Daten |

Kein Nutzer hat Lese-/Schreibzugriff auf Daten anderer Nutzer außer über die explizit
definierten Verknüpfungen (parent_child_links, class_members) und nur im erlaubten Umfang.

## 2. Tabellen (Überblick)

| Tabelle | Zweck |
|---|---|
| `profiles` | fachliches Profil je Auth-Nutzer, inkl. `role` |
| `parent_child_links` | Eltern ↔ Kind (Status: pending/approved) |
| `classes` | Klasse eines Lehrers, mit `class_code` |
| `class_members` | Kind/Schüler ↔ Klasse |
| `instruments` | handelbare Aktien & ETFs (Referenzdaten) |
| `price_snapshots` | stündliche Kurse je Instrument |
| `portfolios` | ein Musterdepot je Nutzer (Cash) |
| `holdings` | Positionen je Depot |
| `orders` | Kauf-/Verkaufs-Historie |
| `watchlist` | Wunsch-/Beobachtungsliste |
| `learning_progress` | abgeschlossene Module + Quiz-Ergebnis |
| `capital_grants` | vergebenes Lernkapital (erzwingt „einmal je Ereignis") |
| `knowledge_points` | Wissenspunkte-Ledger |
| `house_state` | Haus-Stufe + freigeschaltete Objekte je Kind |
| `challenges` / `challenge_participation` | Challenges & Teilnahme |
| `rankings` | serverseitig berechnete Ranglisten-Snapshots |

## 3. Schema-Skizze (Migrations-Startpunkt)

```sql
-- Rollen
create type user_role as enum ('child','parent','teacher','student','adult');
create type instrument_type as enum ('stock','etf');
create type order_side as enum ('buy','sell');

create table profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null references auth.users(id) on delete cascade,
  role          user_role not null,
  display_name  text not null,        -- kein Klarname erzwungen
  age_band      text,                 -- z.B. '8-10','11-14'
  created_at    timestamptz not null default now()
);

create table parent_child_links (
  parent_profile_id uuid references profiles(id) on delete cascade,
  child_profile_id  uuid references profiles(id) on delete cascade,
  status            text not null default 'pending',  -- pending|approved
  primary key (parent_profile_id, child_profile_id)
);

create table classes (
  id                 uuid primary key default gen_random_uuid(),
  teacher_profile_id uuid not null references profiles(id) on delete cascade,
  name               text not null,
  class_code         text not null unique,
  season_start       date,
  season_end         date,
  created_at         timestamptz not null default now()
);

create table class_members (
  class_id         uuid references classes(id) on delete cascade,
  child_profile_id uuid references profiles(id) on delete cascade,
  primary key (class_id, child_profile_id)
);

create table instruments (
  id        uuid primary key default gen_random_uuid(),
  type      instrument_type not null,
  name      text not null,
  ticker    text,
  isin      text,
  wkn       text,
  sector    text,
  country   text
);

create table price_snapshots (
  instrument_id uuid not null references instruments(id) on delete cascade,
  price_cents   bigint not null,
  as_of         timestamptz not null,
  primary key (instrument_id, as_of)
);

create table portfolios (
  id               uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null unique references profiles(id) on delete cascade,
  cash_cents       bigint not null default 500000,   -- 5.000 € Startkapital
  created_at       timestamptz not null default now()
);

create table holdings (
  portfolio_id   uuid references portfolios(id) on delete cascade,
  instrument_id  uuid references instruments(id) on delete cascade,
  quantity       integer not null check (quantity >= 0),  -- ganze Stücke
  avg_cost_cents bigint not null,
  primary key (portfolio_id, instrument_id)
);

create table orders (
  id            uuid primary key default gen_random_uuid(),
  portfolio_id  uuid not null references portfolios(id) on delete cascade,
  instrument_id uuid not null references instruments(id),
  side          order_side not null,
  quantity      integer not null check (quantity > 0),
  price_cents   bigint not null,
  fee_cents     bigint not null default 500,  -- 5 € pro Order
  executed_at   timestamptz not null default now()
);

create table watchlist (
  profile_id    uuid references profiles(id) on delete cascade,
  instrument_id uuid references instruments(id) on delete cascade,
  primary key (profile_id, instrument_id)
);

create table learning_progress (
  profile_id  uuid references profiles(id) on delete cascade,
  module_id   text not null,           -- referenziert packages/content
  completed_at timestamptz,
  quiz_score  integer,                 -- 0..100
  perfect     boolean not null default false,
  primary key (profile_id, module_id)
);

-- erzwingt "Lernkapital je Ereignis nur einmal"
create table capital_grants (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  reason      text not null,           -- module_done|quiz_perfect|themenblock|milestone
  ref_id      text not null,           -- z.B. module_id / block_id
  amount_cents bigint not null,
  granted_at  timestamptz not null default now(),
  unique (profile_id, reason, ref_id)  -- Doppelvergabe unmöglich
);

create table knowledge_points (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  points      integer not null,
  source      text not null,
  created_at  timestamptz not null default now()
);

create table house_state (
  profile_id      uuid primary key references profiles(id) on delete cascade,
  stage           text not null default 'grundstueck',
  unlocked_objects jsonb not null default '[]'
);
```

## 4. RLS-Policies (Muster)

RLS auf allen Tabellen aktivieren, dann gezielt freigeben. Beispiele:

```sql
alter table portfolios enable row level security;

-- Kind sieht/ändert nur sein eigenes Depot
create policy own_portfolio on portfolios
  for all using (
    owner_profile_id in (select id from profiles where auth_user_id = auth.uid())
  );

-- Eltern dürfen verknüpfte Kind-Depots NUR LESEN
create policy parent_reads_child_portfolio on portfolios
  for select using (
    owner_profile_id in (
      select pcl.child_profile_id
      from parent_child_links pcl
      join profiles p on p.id = pcl.parent_profile_id
      where p.auth_user_id = auth.uid() and pcl.status = 'approved'
    )
  );
```

- **Lehrer-Sicht** läuft NICHT über direkten Tabellenzugriff, sondern über
  **SECURITY DEFINER Views/Functions**, die nur Aggregate liefern
  (z. B. „Wissenspunkte je Schüler", „grobe Depotkennzahl"), niemals einzelne Orders.
- `orders` bekommt **keine** Lese-Policy für Lehrer oder Eltern.

## 5. Geld & Korrektheit

- Alles in Cent rechnen; Anzeige-Formatierung erst in der UI.
- Order-Buchung als **Transaktion** (Cash, Holding, Order in einem Schritt), serverseitig validiert.
- Performance-Basis = Startkapital + bisher gewährtes Lernkapital (aus `capital_grants`).
