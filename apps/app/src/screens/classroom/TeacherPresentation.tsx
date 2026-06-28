import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStore } from "../../store/store.js";
import { Button, HLogo } from "../../ui/components.js";
import { fonts, radius, space, type Palette } from "../../theme.js";
import { useThemedStyles } from "../../theme/ThemeProvider.js";

// Beamer-Präsentation: geführter Durchlauf für den Unterrichtseinstieg. Rein erklärend
// (kein DB-Schreiben, keine echten Depots berührt → inhärent „Sandbox"). Große Schrift,
// wenig Text, projektorfreundlich (heller Hintergrund, dunkle Schrift).
const SLIDES: { emoji: string; titleKey: string; bodyKey: string }[] = [
  { emoji: "👋", titleKey: "present.s1Title", bodyKey: "present.s1Body" },
  { emoji: "📚", titleKey: "present.s2Title", bodyKey: "present.s2Body" },
  { emoji: "🔎", titleKey: "present.s3Title", bodyKey: "present.s3Body" },
  { emoji: "🧪", titleKey: "present.s4Title", bodyKey: "present.s4Body" },
  { emoji: "🏅", titleKey: "present.s5Title", bodyKey: "present.s5Body" },
  { emoji: "🚀", titleKey: "present.s6Title", bodyKey: "present.s6Body" },
];

export function TeacherPresentation({ classCode, onClose }: { classCode: string; onClose: () => void }) {
  const { t } = useStore();
  const styles = useThemedStyles(makeStyles);
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return (
    <View style={styles.overlay}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <HLogo size={28} />
          <Text style={styles.brand}>Hofino</Text>
        </View>
        <Pressable onPress={onClose} testID="present-close" hitSlop={10}>
          <Text style={styles.close}>{t("present.close")}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.title}>{t(slide.titleKey)}</Text>
        <Text style={styles.text}>{t(slide.bodyKey)}</Text>
        {last && (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>{t("present.joinCode")}</Text>
            <Text style={styles.code}>{classCode}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, idx) => (
          <View key={idx} style={[styles.dot, idx === i && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.nav}>
        <View style={styles.navBtn}>
          <Button title={t("present.back")} variant="secondary" onPress={() => setI((n) => Math.max(0, n - 1))} testID="present-back" />
        </View>
        <View style={styles.navBtn}>
          {last ? (
            <Button title={t("present.finish")} onPress={onClose} testID="present-finish" />
          ) : (
            <Button title={t("present.next")} onPress={() => setI((n) => Math.min(SLIDES.length - 1, n + 1))} testID="present-next" />
          )}
        </View>
      </View>
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
    body: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.lg },
    emoji: { fontSize: 72 },
    title: { fontFamily: fonts.display, color: c.text, fontSize: 40, lineHeight: 46, textAlign: "center" },
    text: { fontFamily: fonts.body, color: c.muted, fontSize: 24, lineHeight: 34, textAlign: "center", maxWidth: 760 },
    codeBox: { alignItems: "center", gap: space.xs, marginTop: space.md },
    codeLabel: { fontFamily: fonts.body, color: c.muted, fontSize: 20 },
    code: { fontFamily: fonts.display, color: c.navy, fontSize: 56, letterSpacing: 6 },
    dots: { flexDirection: "row", justifyContent: "center", gap: space.sm, paddingVertical: space.md },
    dot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: c.border },
    dotActive: { backgroundColor: c.green, width: 26 },
    nav: { flexDirection: "row", gap: space.md, padding: space.lg },
    navBtn: { flex: 1 },
  });
