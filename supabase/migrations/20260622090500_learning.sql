-- Hofino – Lern-/Festigungs-Kern (Spec §3–§5, §7, §9). Schritt 1: nur Datenmodell.
-- Inhalts-Tabellen: für Angemeldete lesbar. Nutzer-Tabellen: nur Eigentümer (RLS),
-- Schreiben des Lernstands später ausschließlich über serverseitige RPC (Manipulationsschutz).

-- ─────────────────────────────────────────────────────────────────────────────
-- Inhalte (redaktionell / parametrisch)
-- ─────────────────────────────────────────────────────────────────────────────
create table themenbloecke (
  id    text primary key,
  titel jsonb not null
);

create table konzepte (
  id               text primary key,
  modul_nr         integer not null,
  themenblock_id   text not null references themenbloecke (id) on delete cascade,
  titel            jsonb not null,
  ist_rechnerisch  boolean not null default false,
  voraussetzungen  text[] not null default '{}',     -- Konzept-IDs (keine FK: Kette darf lückenhaft geseedet sein)
  freischalt_level integer not null default 1,
  erklaerungen     jsonb not null,                   -- { kind_8_10, kind_11_14, eltern_lehrer }
  stufen           text[] not null
);

create table fragen (
  id                            text primary key,
  konzept_id                    text not null references konzepte (id) on delete cascade,
  stufe                         text not null,
  typ                           text not null default 'multiple_choice',
  frage                         jsonb not null,
  korrekte_antwort              jsonb not null,
  distraktor_pool               jsonb not null,      -- [{ text, naehe }]
  anzahl_distraktoren_angezeigt integer not null default 3,
  erklaerung_nach_antwort       jsonb not null,
  wissenspunkte                 integer not null default 100
);
create index fragen_konzept_stufe on fragen (konzept_id, stufe);

create table vorlagen (
  id                      text primary key,
  konzept_id              text not null references konzepte (id) on delete cascade,
  stufe                   text not null,
  parameter               jsonb not null,            -- { name: { typ, min, max } }
  frage_vorlage           jsonb not null,
  loesung_formel          text not null,
  distraktor_formeln      jsonb not null,            -- [string]
  einheit                 text,
  rundung                 text not null default 'ganzzahl',
  erklaerung_nach_antwort jsonb,
  wissenspunkte           integer not null default 150
);
create index vorlagen_konzept_stufe on vorlagen (konzept_id, stufe);

create table auszeichnungen (
  id           text primary key,
  ebene        text not null,           -- rekord | meilenstein
  kategorie    text,
  titel        jsonb not null,
  typ          text,                     -- gestuft
  permanent    boolean not null default true,
  stufen       jsonb,                    -- [{ rang, bedingung, belohnung }]
  metrik       text,                     -- für Rekorde
  anzeige      text,
  saisonal     boolean not null default false,
  start        date,
  ende         date,
  sichtbarkeit text default 'freunde_freigabe'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Nutzerbezogener Lernstand (nur Eigentümer; Schreiben via RPC/service_role)
-- ─────────────────────────────────────────────────────────────────────────────
create table lern_sr_zustand (
  profile_id            uuid not null references profiles (id) on delete cascade,
  konzept_id            text not null references konzepte (id) on delete cascade,
  leitner_box           integer not null default 1 check (leitner_box between 1 and 5),
  richtig_in_folge      integer not null default 0,
  gemeistert            boolean not null default false,
  naechste_faelligkeit  date,
  letzte_antwort_korrekt boolean,
  primary key (profile_id, konzept_id)
);

create table lern_konzept_fortschritt (
  profile_id                   uuid not null references profiles (id) on delete cascade,
  konzept_id                   text not null references konzepte (id) on delete cascade,
  erklaerung_gesehen           boolean not null default false,
  hoechste_abgeschlossene_stufe text,
  primary key (profile_id, konzept_id)
);

create table lern_antworten (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles (id) on delete cascade,
  konzept_id     text not null references konzepte (id) on delete cascade,
  frage_id       text,
  vorlage_id     text,
  stufe          text not null,
  korrekt        boolean not null,
  ist_wiederholung boolean not null default false,
  xp             integer not null default 0,
  beantwortet_at timestamptz not null default now(),
  beantwortet_am date not null default current_date
);
create index lern_antworten_lookup on lern_antworten (profile_id, beantwortet_am);

create table lern_status (
  profile_id uuid primary key references profiles (id) on delete cascade,
  xp_gesamt  bigint not null default 0,   -- lebenslang (Wissenslevel)
  xp_saison  bigint not null default 0,   -- laufende Saison (Wissensliga)
  saison     text
);

create table lern_tageszaehler (
  profile_id            uuid not null references profiles (id) on delete cascade,
  datum                 date not null default current_date,
  neue_genutzt          integer not null default 0,
  wiederholungen_genutzt integer not null default 0,
  wiederhol_xp          integer not null default 0,
  primary key (profile_id, datum)
);

create table nutzer_auszeichnung (
  profile_id      uuid not null references profiles (id) on delete cascade,
  auszeichnung_id text not null references auszeichnungen (id) on delete cascade,
  rang            text not null default '-',
  erreicht_at     timestamptz not null default now(),
  primary key (profile_id, auszeichnung_id, rang)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Rechte & RLS
-- ─────────────────────────────────────────────────────────────────────────────
grant select on themenbloecke, konzepte, fragen, vorlagen, auszeichnungen to authenticated;
grant select on lern_sr_zustand, lern_konzept_fortschritt, lern_antworten, lern_status,
  lern_tageszaehler, nutzer_auszeichnung to authenticated;
grant all on themenbloecke, konzepte, fragen, vorlagen, auszeichnungen,
  lern_sr_zustand, lern_konzept_fortschritt, lern_antworten, lern_status,
  lern_tageszaehler, nutzer_auszeichnung to service_role;

alter table themenbloecke            enable row level security;
alter table konzepte                 enable row level security;
alter table fragen                   enable row level security;
alter table vorlagen                 enable row level security;
alter table auszeichnungen           enable row level security;
alter table lern_sr_zustand          enable row level security;
alter table lern_konzept_fortschritt enable row level security;
alter table lern_antworten           enable row level security;
alter table lern_status              enable row level security;
alter table lern_tageszaehler        enable row level security;
alter table nutzer_auszeichnung      enable row level security;

-- Inhalte: für alle Angemeldeten lesbar
create policy themenbloecke_read on themenbloecke for select to authenticated using (true);
create policy konzepte_read      on konzepte      for select to authenticated using (true);
create policy fragen_read        on fragen        for select to authenticated using (true);
create policy vorlagen_read      on vorlagen      for select to authenticated using (true);
create policy auszeichnungen_read on auszeichnungen for select to authenticated using (true);

-- Nutzer-Lernstand: nur Eigentümer lesen; Schreiben via service_role-RPC (keine Write-Policy)
create policy sr_own        on lern_sr_zustand          for select to authenticated using (profile_id in (select current_profile_ids()));
create policy fortschritt_own on lern_konzept_fortschritt for select to authenticated using (profile_id in (select current_profile_ids()));
create policy antworten_own  on lern_antworten           for select to authenticated using (profile_id in (select current_profile_ids()));
create policy status_own     on lern_status              for select to authenticated using (profile_id in (select current_profile_ids()));
create policy tageszaehler_own on lern_tageszaehler      for select to authenticated using (profile_id in (select current_profile_ids()));
create policy nutzer_ausz_own on nutzer_auszeichnung     for select to authenticated using (profile_id in (select current_profile_ids()));
