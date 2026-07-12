import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase.js";
import { Button, Card, H1, H2, HLogo, Muted } from "../ui/components.js";
import { fonts, font, space, type Palette } from "../theme.js";
import { useThemedStyles } from "../theme/ThemeProvider.js";

// ─────────────────────────────────────────────────────────────────────────────
// Entwickler-Login (nur wenn DEV_LOGIN aktiv): schnelle Persona-Auswahl zum
// Durchtesten aller Rollen/Szenarien ohne manuelles Anmelden. Selbst-bootstrappend:
// Personas werden per normalem Signup + Profil-Insert angelegt (funktioniert lokal
// und in der Cloud ohne Seed/Service-Key). Idempotent – zweiter Aufruf meldet nur an.
// NICHT für den Produktivbetrieb – vor dem echten Launch abschalten.
// ─────────────────────────────────────────────────────────────────────────────

const PW = "hofino-dev-2026";
type Role = "child" | "student" | "adult" | "parent" | "teacher";

const P = {
  kind: { email: "dev-kind@hofino.test", role: "child" as Role, name: "Testkind" },
  schueler: { email: "dev-schueler@hofino.test", role: "student" as Role, name: "Testschüler" },
  erwachsen: { email: "dev-erwachsen@hofino.test", role: "adult" as Role, name: "Testerwachsener" },
  eltern: { email: "dev-eltern@hofino.test", role: "parent" as Role, name: "Testeltern" },
  lehrer: { email: "dev-lehrer@hofino.test", role: "teacher" as Role, name: "Testlehrer" },
};

type Persona = (typeof P)[keyof typeof P];

// Persona anmelden; existiert sie nicht, anlegen (Signup + Profil). Gibt die profileId zurück.
async function ensure(p: Persona): Promise<string> {
  const signIn = await supabase.auth.signInWithPassword({ email: p.email, password: PW });
  if (signIn.error) {
    const su = await supabase.auth.signUp({ email: p.email, password: PW });
    if (su.error) throw new Error(su.error.message);
    if (!su.data.session) {
      // E-Mail-Bestätigung ist an → Bootstrap nicht möglich.
      throw new Error("E-Mail-Bestätigung aktiv – Dev-Login nicht möglich (in Supabase deaktivieren).");
    }
  }
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Keine Session nach Anmeldung.");
  const prof = await supabase.from("profiles").select("id").eq("auth_user_id", uid).maybeSingle();
  if (prof.data?.id) return prof.data.id as string;
  const ins = await supabase
    .from("profiles")
    .insert({ auth_user_id: uid, role: p.role, display_name: p.name })
    .select("id")
    .single();
  if (ins.error) throw new Error(ins.error.message);
  return ins.data.id as string;
}

// Kind ⇄ Eltern verknüpfen (idempotent). Danach als gewünschte Seite anmelden.
async function setupChildParent(): Promise<void> {
  const childId = await ensure(P.kind);
  await supabase.auth.signOut();
  const parentId = await ensure(P.eltern);
  // Elternteil verknüpft das Kind (Duplikat ignorieren, falls schon vorhanden).
  await supabase
    .from("parent_child_links")
    .insert({ parent_profile_id: parentId, child_profile_id: childId, status: "pending" });
  await supabase.auth.signOut();
  await ensure(P.kind);
  await supabase.rpc("respond_to_parent_link", { p_parent: parentId, p_approve: true });
}

// Lehrer + Klasse + Schüler verknüpfen (idempotent). Klassencode wird wiederverwendet.
async function setupStudentTeacher(): Promise<void> {
  const teacherId = await ensure(P.lehrer);
  const existing = await supabase
    .from("classes")
    .select("class_code")
    .eq("teacher_profile_id", teacherId)
    .limit(1)
    .maybeSingle();
  let code = existing.data?.class_code as string | undefined;
  if (!code) {
    const r = await supabase.rpc("create_class", { p_name: "Testklasse", p_consent: true });
    code = r.data?.class_code as string;
  }
  await supabase.auth.signOut();
  await ensure(P.schueler);
  if (code) await supabase.rpc("join_class", { p_code: code });
}

// Am Ende sauber als Ziel-Persona anmelden → der Store lädt automatisch neu.
// Der abschließende Re-Login stellt sicher, dass der Store MIT bereits vorhandenem
// Profil lädt (nach einem Erst-Signup lief das erste Laden sonst ohne Profil).
async function finishAs(p: Persona): Promise<void> {
  await supabase.auth.signOut();
  await ensure(p);
  await supabase.auth.signOut();
  const r = await supabase.auth.signInWithPassword({ email: p.email, password: PW });
  if (r.error) throw new Error(r.error.message);
}

export function DevLogin({
  onRealAuth,
  onRealAuthLabel = "Zur echten Anmeldung",
  onContinueAsSelf,
}: {
  onRealAuth?: () => void;
  onRealAuthLabel?: string;
  onContinueAsSelf?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (key: string, fn: () => Promise<void>) => async () => {
    if (busy) return;
    setError(null);
    setBusy(key);
    try {
      await fn();
      // Erfolg: onAuthStateChange stößt das Neuladen an → dieser Screen verschwindet.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
      setBusy(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.brandRow}>
        <HLogo size={32} />
        <H1>Entwickler-Login</H1>
      </View>
      <Muted>Wähle eine Persona zum Durchtesten. Konten werden bei Bedarf automatisch angelegt.</Muted>

      <Card>
        <H2 style={styles.section}>Einzeln</H2>
        <Button title="Kind" testID="dev-kind" loading={busy === "kind"} onPress={run("kind", () => finishAs(P.kind))} />
        <Button title="Schüler" testID="dev-schueler" loading={busy === "schueler"} onPress={run("schueler", () => finishAs(P.schueler))} />
        <Button title="Erwachsener" testID="dev-erwachsen" loading={busy === "erwachsen"} onPress={run("erwachsen", () => finishAs(P.erwachsen))} />
        <Button title="Eltern" testID="dev-eltern" loading={busy === "eltern"} onPress={run("eltern", () => finishAs(P.eltern))} />
        <Button title="Lehrer" testID="dev-lehrer" loading={busy === "lehrer"} onPress={run("lehrer", () => finishAs(P.lehrer))} />
      </Card>

      <Card>
        <H2 style={styles.section}>Verknüpft (Eltern ⇄ Kind)</H2>
        <Muted>Legt ein verknüpftes Eltern-Kind-Paar an.</Muted>
        <Button
          title="Als Kind (mit Eltern)"
          testID="dev-kind-eltern"
          variant="secondary"
          loading={busy === "kind-eltern"}
          onPress={run("kind-eltern", async () => {
            await setupChildParent();
            await finishAs(P.kind);
          })}
        />
        <Button
          title="Als Eltern (mit Kind)"
          testID="dev-eltern-kind"
          variant="secondary"
          loading={busy === "eltern-kind"}
          onPress={run("eltern-kind", async () => {
            await setupChildParent();
            await finishAs(P.eltern);
          })}
        />
      </Card>

      <Card>
        <H2 style={styles.section}>Verknüpft (Lehrer ⇄ Schüler)</H2>
        <Muted>Legt Lehrer + Klasse an und lässt den Schüler beitreten.</Muted>
        <Button
          title="Als Schüler (mit Lehrer/Klasse)"
          testID="dev-schueler-lehrer"
          variant="secondary"
          loading={busy === "schueler-lehrer"}
          onPress={run("schueler-lehrer", async () => {
            await setupStudentTeacher();
            await finishAs(P.schueler);
          })}
        />
        <Button
          title="Als Lehrer (mit Klasse & Schüler)"
          testID="dev-lehrer-schueler"
          variant="secondary"
          loading={busy === "lehrer-schueler"}
          onPress={run("lehrer-schueler", async () => {
            await setupStudentTeacher();
            await finishAs(P.lehrer);
          })}
        />
      </Card>

      {error && <Text style={styles.error}>{error}</Text>}
      {onContinueAsSelf && (
        <Button
          title="Als dieses Konto weiter (z. B. für Einwilligungen)"
          testID="dev-continue-self"
          variant="secondary"
          onPress={onContinueAsSelf}
        />
      )}
      {onRealAuth && (
        <Button title={onRealAuthLabel} testID="dev-real-auth" variant="ghost" onPress={onRealAuth} />
      )}
      <Muted>Nur zum Testen – vor dem echten Launch abschalten.</Muted>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { padding: space.lg, gap: space.md, backgroundColor: c.bg },
    brandRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
    section: { marginBottom: space.xs },
    error: { color: c.danger, fontSize: font.body, fontFamily: fonts.bodySemi },
  });
