import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { rank } from "@hofino/core";
import { MODULES } from "@hofino/content";
import { useStore, type ClassOverviewRow } from "../../store/store.js";
import { Button } from "../../ui/components.js";
import { colors, space } from "../../theme.js";

// Große Klassenansicht für den Beamer.
export function TeacherBeamer() {
  const { fetchTeacherClass, fetchClassOverview } = useStore();
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<ClassOverviewRow[]>([]);
  const [empty, setEmpty] = useState(false);

  const reload = useCallback(async () => {
    const c = await fetchTeacherClass();
    if (!c) {
      setEmpty(true);
      return;
    }
    setTitle(`${c.name} · Code ${c.code}`);
    setRows(await fetchClassOverview(c.id));
  }, [fetchTeacherClass, fetchClassOverview]);

  useEffect(() => {
    reload();
  }, [reload]);

  const ranked = rank(rows.map((r) => ({ id: r.childProfileId, score: r.knowledgePoints })), 10);
  const byId = new Map(rows.map((r) => [r.childProfileId, r]));

  if (empty) {
    return (
      <View style={styles.center}>
        <Text style={styles.big}>Noch keine Klasse</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={{ alignSelf: "flex-end" }}>
        <Button title="Aktualisieren" variant="secondary" onPress={reload} testID="beamer-refresh" />
      </View>
      {ranked.map((e) => {
        const row = byId.get(e.id);
        return (
          <View key={e.id} style={styles.row}>
            <Text style={styles.rank}>{e.rank}</Text>
            <Text style={styles.name}>{row?.displayName}</Text>
            <Text style={styles.meta}>
              {row?.modulesCompleted}/{MODULES.length} · {row?.knowledgePoints} P
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.xl, gap: space.lg, backgroundColor: colors.primary, flexGrow: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  title: { fontSize: 40, fontWeight: "800", color: "#FFFFFF" },
  big: { fontSize: 40, fontWeight: "800", color: "#FFFFFF" },
  row: { flexDirection: "row", alignItems: "center", gap: space.lg, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.2)", paddingVertical: space.md },
  rank: { fontSize: 40, fontWeight: "800", color: colors.accent, width: 60 },
  name: { fontSize: 36, fontWeight: "700", color: "#FFFFFF", flex: 1 },
  meta: { fontSize: 28, color: colors.secondary, fontWeight: "700" },
});
