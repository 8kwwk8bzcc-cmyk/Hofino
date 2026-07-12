import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { formatEuros, rank } from "@hofino/core";
import { alleKonzepte } from "@hofino/learning";
import { useStore, type ChildSummary, type PendingConsent } from "../../store/store.js";
import { Body, Button, Card, H1, H2, Muted, Pill } from "../../ui/components.js";
import { formatDateDE } from "../../challengeMetrics.js";
import { font, fonts, space, type Palette } from "../../theme.js";
import { useThemedStyles } from "../../theme/ThemeProvider.js";

// Eltern-Dashboard: Lernfortschritt + Depotentwicklung der verknüpften Kinder (nur lesend).
export function FamilyHome() {
  const { fetchFamily, fetchPendingConsents, confirmConsent, state, t } = useStore();
  const styles = useThemedStyles(makeStyles);
  const [children, setChildren] = useState<ChildSummary[] | null>(null);
  const [consents, setConsents] = useState<PendingConsent[]>([]);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchFamily().then((c) => {
      if (active) setChildren(c);
    });
    fetchPendingConsents().then((rows) => {
      if (active) setConsents(rows);
    });
    return () => {
      active = false;
    };
  }, [fetchFamily, fetchPendingConsents, state.pendingLinks]);

  const confirm = async (childProfileId: string) => {
    setConsentError(null);
    setBusy(childProfileId);
    const r = await confirmConsent(childProfileId);
    setBusy(null);
    if (!r.ok) {
      setConsentError(r.message);
      return;
    }
    setConsents(await fetchPendingConsents());
    setChildren(await fetchFamily());
  };

  const challenge = rank((children ?? []).map((c) => ({ id: c.profileId, score: c.knowledgePoints })), 10);
  const nameById = new Map((children ?? []).map((c) => [c.profileId, c.displayName]));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.top}>
        <Muted>{t("tab.family")}</Muted>
        <H1>{state.displayName}</H1>
      </View>

      {consents.length > 0 && (
        <Card testID="consent-card">
          <H2>{t("consent.title")}</H2>
          <Body>{t("consent.parentIntro")}</Body>
          {consentError && <Muted>{consentError}</Muted>}
          {consents.map((k) => (
            <View key={k.childProfileId} style={{ gap: space.sm }}>
              <View style={styles.row}>
                <H2>{k.displayName}</H2>
                {k.deadline && <Muted>{t("consent.deadline", { date: formatDateDE(k.deadline) })}</Muted>}
              </View>
              <Button
                testID={`consent-confirm-${k.displayName}`}
                title={t("consent.confirm")}
                loading={busy === k.childProfileId}
                onPress={() => confirm(k.childProfileId)}
              />
            </View>
          ))}
        </Card>
      )}

      {children === null ? (
        <Muted>{t("family.loading")}</Muted>
      ) : children.length === 0 ? (
        <Card>
          <H2>{t("family.noChild")}</H2>
          <Body>{t("family.noChildBody")}</Body>
        </Card>
      ) : (
        <>
          {children.map((c) => (
            <Card key={c.profileId}>
              <View style={styles.row}>
                <H2>{c.displayName}</H2>
                <Pill
                  label={`${c.performancePercent >= 0 ? "+" : ""}${c.performancePercent.toFixed(1)} %`}
                  tone={c.performancePercent >= 0 ? "good" : "neutral"}
                />
              </View>
              <View style={styles.row}>
                <Muted>{t("home.equity")}</Muted>
                <Text style={styles.val}>{formatEuros(c.equityCents)}</Text>
              </View>
              <View style={styles.row}>
                <Muted>{t("adult.learnProgress")}</Muted>
                <Text style={styles.val}>{t("home.modulesPill", { done: c.completedCount, total: alleKonzepte().length })}</Text>
              </View>
              <View style={styles.row}>
                <Muted>{t("home.knowledge")}</Muted>
                <Text style={styles.val}>{c.knowledgePoints}</Text>
              </View>
              <Muted>{t("family.readOnly")}</Muted>
            </Card>
          ))}

          {children.length > 1 && (
            <Card>
              <H2>{t("family.challenge")}</H2>
              <Muted>{t("family.challengeQ")}</Muted>
              {challenge.map((e) => (
                <View key={e.id} style={styles.row}>
                  <Text style={styles.rank}>
                    {e.awarded && e.rank <= 3 ? "🏅" : ""} {e.rank}. {nameById.get(e.id)}
                  </Text>
                  <Text style={styles.val}>{Math.round(e.score)} P</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { padding: space.lg, gap: space.md, backgroundColor: c.bg },
    top: { marginTop: space.sm },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    val: { fontSize: font.body, fontWeight: "700", fontFamily: fonts.display, color: c.text },
    rank: { fontSize: font.body, fontFamily: fonts.body, color: c.text },
  });
