import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { formatEuros, rank } from "@hofino/core";
import { MODULES } from "@hofino/content";
import { alleKonzepte } from "@hofino/learning";
import { useStore, type ClassOverviewRow, type TeacherClass as TClass } from "../../store/store.js";
import { Body, Button, Card, H1, H2, Muted, Pill } from "../../ui/components.js";
import { colors, font, radius, space } from "../../theme.js";

export function TeacherClass() {
  const { fetchTeacherClass, fetchClassOverview, createClass, fetchAssignments, assignKonzept, unassignKonzept, t } = useStore();
  const [cls, setCls] = useState<TClass | null>(null);
  const [rows, setRows] = useState<ClassOverviewRow[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const konzepte = alleKonzepte();

  const reload = useCallback(async () => {
    const c = await fetchTeacherClass();
    setCls(c);
    setRows(c ? await fetchClassOverview(c.id) : []);
    setAssigned(c ? new Set(await fetchAssignments(c.id)) : new Set());
    setLoaded(true);
  }, [fetchTeacherClass, fetchClassOverview, fetchAssignments]);

  const toggleAssign = async (konzeptId: string) => {
    if (!cls) return;
    const next = new Set(assigned);
    if (next.has(konzeptId)) {
      next.delete(konzeptId);
      setAssigned(next);
      await unassignKonzept(cls.id, konzeptId);
    } else {
      next.add(konzeptId);
      setAssigned(next);
      await assignKonzept(cls.id, konzeptId);
    }
  };

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
      <H1>{t("tab.class")}</H1>

      {!cls ? (
        <Card>
          <H2>{t("class.create")}</H2>
          <Body>{t("class.createBody")}</Body>
          <TextInput
            testID="class-name-input"
            value={name}
            onChangeText={setName}
            placeholder={t("class.namePlaceholder")}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Button title={t("class.create")} onPress={create} disabled={name.trim().length < 1} testID="create-class" />
          {msg && <Text style={styles.msg}>{msg}</Text>}
        </Card>
      ) : (
        <>
          <Card>
            <H2>{cls.name}</H2>
            <Muted>{t("class.codeToJoin")}</Muted>
            <Text style={styles.code} testID="class-code">
              {cls.code}
            </Text>
            <Button title={t("class.refresh")} variant="secondary" onPress={reload} testID="refresh-class" />
          </Card>

          <Card>
            <H2>{t("class.students", { n: rows.length })}</H2>
            {rows.length === 0 ? (
              <Muted>{t("class.noStudents", { code: cls.code })}</Muted>
            ) : (
              rows.map((r) => (
                <View key={r.childProfileId} style={styles.studentRow}>
                  <Text style={styles.studentName}>{r.displayName}</Text>
                  <View style={styles.metrics}>
                    <Muted>{t("class.studentMetrics", { done: r.modulesCompleted, total: MODULES.length, points: r.knowledgePoints })}</Muted>
                    <Muted>≈ {formatEuros(r.depotValueRoundedCents)}</Muted>
                  </View>
                </View>
              ))
            )}
            <Muted>{t("class.aggregatesOnly")}</Muted>
          </Card>

          <Card>
            <H2>{t("class.assignTitle")}</H2>
            <Muted>{t("class.assignHint")}</Muted>
            {konzepte.map((k) => {
              const on = assigned.has(k.id);
              return (
                <Pressable
                  key={k.id}
                  testID={`assign-${k.id}`}
                  onPress={() => toggleAssign(k.id)}
                  style={[styles.assignRow, on && styles.assignRowOn]}
                >
                  <Text style={styles.assignName}>{k.titel.de}</Text>
                  {on ? <Pill label={t("class.assigned")} tone="good" /> : <Text style={styles.assignAdd}>+</Text>}
                </Pressable>
              );
            })}
          </Card>

          {rows.length > 0 && (
            <Card>
              <H2>{t("class.challenge")}</H2>
              <Muted>{t("family.challengeQ")}</Muted>
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
  assignRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    marginTop: space.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  assignRowOn: { borderColor: colors.secondary, backgroundColor: "#F0FDF4" },
  assignName: { fontSize: font.body, color: colors.text, flexShrink: 1, paddingRight: space.sm },
  assignAdd: { fontSize: font.h2, color: colors.textMuted, fontWeight: "700" },
  studentRow: { paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 2 },
  studentName: { fontSize: font.body, fontWeight: "700", color: colors.text },
  metrics: { flexDirection: "row", justifyContent: "space-between" },
  rankRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space.xs },
  rankText: { fontSize: font.body, color: colors.text },
  rankScore: { fontSize: font.body, fontWeight: "700", color: colors.text },
});
