import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { alleKonzepte, alleThemenbloecke, erklaerungFuer, type Audience } from "@hofino/learning";
import { useStore } from "../../store/store.js";
import { Button, HLogo } from "../../ui/components.js";
import { fonts, radius, space, type Palette } from "../../theme.js";
import { useThemedStyles } from "../../theme/ThemeProvider.js";

// Inhalts-Beamer: zeigt die aktuell FREIGEGEBENEN Themenblöcke und ihre Konzepte
// (Erklärtext, Kinder-Ebene) projektorfreundlich am Bildschirm. Rein erklärend –
// keine DB-Schreibzugriffe, KEINE individuellen Schülerdaten (Spec §Präsentation).
const AUDIENCE: Audience = "learners_10_14";

export function TeacherContentBeamer({ locked, onClose }: { locked: Set<string>; onClose: () => void }) {
  const { t } = useStore();
  const styles = useThemedStyles(makeStyles);
  const bloecke = alleThemenbloecke().filter((b) => !locked.has(b.id));
  const konzepte = alleKonzepte();

  const [blockId, setBlockId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  const block = blockId ? bloecke.find((b) => b.id === blockId) : null;
  const blockKonzepte = block ? konzepte.filter((k) => k.themenblock_id === block.id) : [];
  const konzept = blockKonzepte[idx];
  const last = idx >= blockKonzepte.length - 1;

  const openBlock = (id: string) => {
    setBlockId(id);
    setIdx(0);
  };
  const backToBlocks = () => {
    setBlockId(null);
    setIdx(0);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <HLogo size={28} />
          <Text style={styles.brand}>{t("present.contentTitle")}</Text>
        </View>
        <Pressable onPress={onClose} testID="content-close" hitSlop={10}>
          <Text style={styles.close}>{t("present.close")}</Text>
        </Pressable>
      </View>

      {/* Blockübersicht */}
      {!block && (
        <ScrollView contentContainerStyle={styles.listBody}>
          <Text style={styles.listTitle}>{t("present.pickBlockHint")}</Text>
          {bloecke.length === 0 ? (
            <Text style={styles.emptyNote}>{t("present.noReleased")}</Text>
          ) : (
            bloecke.map((b) => (
              <Pressable
                key={b.id}
                testID={`content-block-${b.id}`}
                onPress={() => openBlock(b.id)}
                style={styles.blockCard}
              >
                <Text style={styles.blockName}>{b.titel.de}</Text>
                <Text style={styles.blockCount}>
                  {t("present.conceptCount", { n: konzepte.filter((k) => k.themenblock_id === b.id).length })}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* Konzept-Anzeige innerhalb eines Blocks */}
      {block && konzept && (
        <>
          <Pressable onPress={backToBlocks} testID="content-back-blocks" hitSlop={8} style={styles.crumb}>
            <Text style={styles.crumbText}>{`‹ ${block.titel.de}`}</Text>
          </Pressable>
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.progress}>
              {t("present.conceptProgress", { n: idx + 1, total: blockKonzepte.length })}
            </Text>
            <Text style={styles.title}>{konzept.titel.de}</Text>
            <Text style={styles.text}>{erklaerungFuer(konzept, AUDIENCE)}</Text>
          </ScrollView>

          <View style={styles.nav}>
            <View style={styles.navBtn}>
              <Button
                title={t("present.back")}
                variant="secondary"
                onPress={() => (idx > 0 ? setIdx((n) => n - 1) : backToBlocks())}
                testID="content-prev"
              />
            </View>
            <View style={styles.navBtn}>
              {last ? (
                <Button title={t("present.backToBlocks")} onPress={backToBlocks} testID="content-to-blocks" />
              ) : (
                <Button title={t("present.next")} onPress={() => setIdx((n) => n + 1)} testID="content-next" />
              )}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.bg, zIndex: 60 },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
    },
    brandRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
    brand: { fontFamily: fonts.display, color: c.navy, fontSize: 22 },
    close: { fontFamily: fonts.body, color: c.muted, fontSize: 16 },
    listBody: { padding: space.xl, gap: space.md, alignItems: "stretch", maxWidth: 900, alignSelf: "center", width: "100%" },
    listTitle: { fontFamily: fonts.display, color: c.text, fontSize: 28, textAlign: "center", marginBottom: space.sm },
    emptyNote: { fontFamily: fonts.body, color: c.muted, fontSize: 22, textAlign: "center" },
    blockCard: {
      padding: space.lg,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: space.xs,
    },
    blockName: { fontFamily: fonts.display, color: c.text, fontSize: 26 },
    blockCount: { fontFamily: fonts.body, color: c.muted, fontSize: 18 },
    crumb: { paddingHorizontal: space.lg, paddingBottom: space.sm },
    crumbText: { fontFamily: fonts.body, color: c.green, fontSize: 18 },
    body: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.lg },
    progress: { fontFamily: fonts.body, color: c.muted, fontSize: 20 },
    title: { fontFamily: fonts.display, color: c.text, fontSize: 40, lineHeight: 46, textAlign: "center" },
    text: { fontFamily: fonts.body, color: c.text, fontSize: 26, lineHeight: 38, textAlign: "center", maxWidth: 820 },
    nav: { flexDirection: "row", gap: space.md, padding: space.lg },
    navBtn: { flex: 1 },
  });
