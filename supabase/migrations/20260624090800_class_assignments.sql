-- Hofino – Classroom: Lehrer weist der Klasse Lern-Konzepte (Module) zu.
-- Zuweisung = Hervorhebung/Empfehlung für die Schüler, KEIN Lock (Spec §1: nie bestrafen).
-- Schreiben nur durch den Lehrer der eigenen Klasse (RLS, analog class_members);
-- Schüler dürfen die Zuweisungen ihrer Klasse nur lesen.

create table class_assignments (
  class_id    uuid not null references classes (id) on delete cascade,
  konzept_id  text not null references konzepte (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (class_id, konzept_id)
);

alter table class_assignments enable row level security;

create policy class_assignments_teacher on class_assignments
  for all to authenticated
  using (class_id in (select teacher_class_ids()))
  with check (class_id in (select teacher_class_ids()));

create policy class_assignments_member_reads on class_assignments
  for select to authenticated
  using (class_id in (select my_class_ids()));

-- Der pauschale Grant in 20260622090100 greift nur für damals existierende Tabellen.
grant select, insert, delete on class_assignments to authenticated;
