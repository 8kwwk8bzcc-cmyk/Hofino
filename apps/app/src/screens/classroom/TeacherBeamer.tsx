import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { rank } from "@hofino/core";
import { alleKonzepte } from "@hofino/learning";
import { useStore, type ClassOverviewRow } from "../../store/store.js";
import { Button } from "../../ui/components.js";
import { fonts, space, type Palette } from "../../theme.js";
import { useThemedStyles } from "../../theme/ThemeProvider.js";

// Große Klassenansicht für den Beamer.
export function TeacherBeamer() {
  const { fetchTeacherClass, fetchClassOverview, t } = useStore();
  const styles = useThemedStyles(makeStyles);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<ClassOverviewRow[]>([]);
  const [empty, setEmpty] = useState(false);

  const reload = useCallback(async () => {
    const c = await fetchTeacherClass();
    if (!c) {
      setEmpty(true);
      return;
    }
    setTitle(t("class.beamerTitle", { name: c.name, code: c.code }));
    setRows(await fetchClassOverview(c.id));
  }, [fetchTeacherClass, fetchClassOverview, t]);

  useEffect(() => {
    reload();
  }, [reload]);

  const ranked = rank(rows.map((r) => ({ id: r.childProfileId, score: r.knowledgePoints })), 10);
  const byId = new Map(rows.map((r) => [r.childProfileId, r]));

  if (empty) {
    return (
      <View style={styles.center}>
        <Text style={styles.big}>{t("class.noClass")}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={{ alignSelf: "flex-end" }}>
        <Button title={t("class.refresh")} variant="secondary" onPress={reload} testID="beamer-refresh" />
      </View>
      {ranked.map((e) => {
        const row = byId.get(e.id);
        return (
          <View key={e.id} style={styles.row}>
            <Text style={styles.rank}>{e.rank}</Text>
            <Text style={styles.name}>{row?.displayName}</Text>
            <Text style={styles.meta}>
              {t("class.beamerMeta", { done: row?.modulesCompleted ?? 0, total: alleKonzepte().length, points: row?.knowledgePoints ?? 0 })}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { padding: space.xl, gap: space.lg, backgroundColor: c.navy, flexGrow: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.navy },
    title: { fontSize: 40, fontWeight: "800", fontFamily: fonts.bodyBold, color: "#FFFFFF" },
    big: { fontSize: 40, fontWeight: "800", fontFamily: fonts.display, color: "#FFFFFF" },
    row: { flexDirection: "row", alignItems: "center", gap: space.lg, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.2)", paddingVertical: space.md },
    rank: { fontSize: 40, fontWeight: "800", fontFamily: fonts.bodyBold, color: c.gold, width: 60 },
    name: { fontSize: 36, fontWeight: "700", fontFamily: fonts.bodyBold, color: "#FFFFFF", flex: 1 },
    meta: { fontSize: 28, color: c.green, fontWeight: "700", fontFamily: fonts.bodyBold },
  });
