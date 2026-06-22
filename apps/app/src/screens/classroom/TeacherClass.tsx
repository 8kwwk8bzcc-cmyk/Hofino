import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { formatEuros, rank } from "@hofino/core";
import { MODULES } from "@hofino/content";
import { useStore, type ClassOverviewRow, type TeacherClass as TClass } from "../../store/store.js";
import { Body, Button, Card, H1, H2, Muted } from "../../ui/components.js";
import { colors, font, radius, space } from "../../theme.js";

export function TeacherClass() {
  const { fetchTeacherClass, fetchClassOverview, createClass } = useStore();
  const [cls, setCls] = useState<TClass | null>(null);
  const [rows, setRows] = useState<ClassOverviewRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const c = await fetchTeacherClass();
    setCls(c);
    setRows(c ? await fetchClassOverview(c.id) : []);
    setLoaded(true);
  }, [fetchTeacherClass, fetchClassOverview]);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = async () => {
    setMsg(null);
    const r = await createClass(name.trim());
    if (r.ok) {
      setName("");
      await reload();
    } else {
      setMsg(r.message);
    }
  };

  const ranked = rank(rows.map((r) => ({ id: r.childProfileId, score: r.knowledgePoints })), 10);
  const nameById = new Map(rows.map((r) => [r.childProfileId, r.displayName]));

  if (!loaded) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <H1>Klasse</H1>

      {!cls ? (
        <Card>
          <H2>Klasse erstellen</H2>
          <Body>Lege eine Klasse an und teile den Code mit deinen Schülern.</Body>
          <TextInput
            testID="class-name-input"
            value={name}
            onChangeText={setName}
            placeholder="Klassenname (z. B. 6a)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Button title="Klasse erstellen" onPress={create} disabled={name.trim().length < 1} testID="create-class" />
          {msg && <Text style={styles.msg}>{msg}</Text>}
        </Card>
      ) : (
        <>
          <Card>
            <H2>{cls.name}</H2>
            <Muted>Klassencode (zum Beitreten):</Muted>
            <Text style={styles.code} testID="class-code">
              {cls.code}
            </Text>
            <Button title="Aktualisieren" variant="secondary" onPress={reload} testID="refresh-class" />
          </Card>

          <Card>
            <H2>Schüler ({rows.length})</H2>
            {rows.length === 0 ? (
              <Muted>Noch keine Schüler beigetreten. Teile den Code {cls.code}.</Muted>
            ) : (
              rows.map((r) => (
                <View key={r.childProfileId} style={styles.studentRow}>
                  <Text style={styles.studentName}>{r.displayName}</Text>
                  <View style={styles.metrics}>
                    <Muted>
                      {r.modulesCompleted}/{MODULES.length} Module · {r.knowledgePoints} P
                    </Muted>
                    <Muted>≈ {formatEuros(r.depotValueRoundedCents)}</Muted>
                  </View>
                </View>
              ))
            )}
            <Muted>Nur Aggregate – keine Einzelorders, keine privaten Daten.</Muted>
          </Card>

          {rows.length > 0 && (
            <Card>
              <H2>Klassen-Challenge</H2>
              <Muted>Wer sammelt die meisten Wissenspunkte?</Muted>
              {ranked.map((e) => (
                <View key={e.id} style={styles.rankRow}>
                  <Text style={styles.rankText}>
                    {e.awarded && e.rank <= 3 ? "🏅" : ""} {e.rank}. {nameById.get(e.id)}
                  </Text>
                  <Text style={styles.rankScore}>{Math.round(e.score)} P</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, backgroundColor: colors.background },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: font.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  msg: { fontSize: font.small, color: colors.primary, fontWeight: "600" },
  code: { fontSize: font.h1, fontWeight: "800", color: colors.primary, letterSpacing: 2 },
  studentRow: { paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 2 },
  studentName: { fontSize: font.body, fontWeight: "700", color: colors.text },
  metrics: { flexDirection: "row", justifyContent: "space-between" },
  rankRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space.xs },
  rankText: { fontSize: font.body, color: colors.text },
  rankScore: { fontSize: font.body, fontWeight: "700", color: colors.text },
});
