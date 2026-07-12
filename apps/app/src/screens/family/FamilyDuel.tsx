import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useStore, type FamilyDuelRow } from "../../store/store.js";
import { Body, Card, H2, Muted, Pill } from "../../ui/components.js";
import { font, fonts, radius, space, type Palette } from "../../theme.js";
import { useColors, useThemedStyles } from "../../theme/ThemeProvider.js";

// Familien-Duell (Eltern spielen GEGEN Kinder): Wochenwertung über den
// Familienkreis + kooperatives Familienziel. Rendert nichts, solange keine
// Familien-Verknüpfung existiert (Karte erscheint erst mit >1 Mitglied).
const GOAL_XP_PER_PLAYER = 300;

export function FamilyDuelCard() {
  const { fetchFamilyDuel, state, t } = useStore();
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [rows, setRows] = useState<FamilyDuelRow[]>([]);

  useEffect(() => {
    let active = true;
    fetchFamilyDuel().then((r) => {
      if (active) setRows(r);
    });
    return () => {
      active = false;
    };
  }, [fetchFamilyDuel, state.pendingLinks]);

  if (rows.length <= 1) return null;

  const players = rows.filter((r) => r.role !== "parent");
  const sumXp = players.reduce((acc, r) => acc + r.xpWeek, 0);
  const target = Math.max(players.length, 1) * GOAL_XP_PER_PLAYER;
  const goalDone = sumXp >= target;
  const progress = Math.min(1, target === 0 ? 0 : sumXp / target);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <Card testID="family-duel">
      <H2>{t("duel.title")}</H2>
      <Muted>{t("duel.subtitle")}</Muted>
      {rows.map((r, i) => {
        const isMe = r.profileId === state.profileId;
        const watching = r.role === "parent";
        return (
          <View key={r.profileId} style={styles.row}>
            <Text style={styles.rank}>{watching ? "👀" : (medals[i] ?? `${i + 1}.`)}</Text>
            <View style={styles.nameBlock}>
              <Text style={[styles.name, isMe && { color: c.green }]}>
                {r.displayName}
                {isMe ? ` (${t("duel.you")})` : ""}
              </Text>
              <Muted>
                {watching
                  ? t("duel.notPlaying")
                  : `${r.korrektWeek} ${t("duel.correct")} · ${r.tageWeek} ${t("duel.days")}`}
              </Muted>
            </View>
            {!watching && <Pill label={`${r.xpWeek} ${t("duel.xp")}`} tone={i === 0 ? "good" : "neutral"} />}
          </View>
        );
      })}
      <View style={styles.goalBlock}>
        <Text style={styles.goalTitle}>{t("duel.goalTitle")}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Body>
          {goalDone
            ? t("duel.goalDone", { sum: String(sumXp), target: String(target) })
            : t("duel.goalBody", { sum: String(sumXp), target: String(target) })}
        </Body>
      </View>
    </Card>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.xs },
    rank: { width: 28, fontSize: font.h3, fontFamily: fonts.body, textAlign: "center" },
    nameBlock: { flex: 1 },
    name: { fontSize: font.body, fontWeight: "700", fontFamily: fonts.bodyBold, color: c.text },
    goalBlock: { gap: space.xs, marginTop: space.sm },
    goalTitle: { fontSize: font.small, fontWeight: "700", fontFamily: fonts.bodyBold, color: c.text },
    barTrack: { height: 10, borderRadius: radius.pill, backgroundColor: c.softBlue, overflow: "hidden" },
    barFill: { height: "100%", borderRadius: radius.pill, backgroundColor: c.green },
  });
