-- Hofino – Classroom: zuweisbare Klassen-Challenges.
-- Der Lehrer setzt der Klasse ein messbares Ziel (Konzepte meistern oder Wissenspunkte
-- sammeln). Nutzt die bestehende challenges-Tabelle (scope='class', class_id, created_by);
-- ergänzt nur ein strukturiertes Ziel. Fortschritt wird client-seitig aus den ohnehin
-- lesbaren Lerndaten berechnet – KEIN Lock, keine Bestrafung (Spec §1/§3).
-- RLS + Grants bestehen bereits (challenges seit init_schema): Lehrer schreibt eigene
-- Klasse (challenges_teacher_writes), Mitglieder lesen ihre Klasse (challenges_read).

alter table challenges add column if not exists goal_metric text;  -- 'konzepte' | 'xp'
alter table challenges add column if not exists goal_target int;
