import React from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, font, fonts, radius, shadow, space } from "../theme.js";

export function Card({
  children,
  style,
  onPress,
  testID,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  testID?: string;
}) {
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [styles.card, style, pressed && styles.cardPressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}
export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}
export function Body({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  testID,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        variant === "primary" && styles.btnPrimary,
        variant === "secondary" && styles.btnSecondary,
        variant === "ghost" && styles.btnGhost,
        disabled && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
    >
      <Text
        style={[
          styles.btnText,
          variant === "secondary" && { color: colors.primary },
          variant === "ghost" && { color: colors.primary },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "gold" }) {
  return (
    <View
      style={[
        styles.pill,
        tone === "good" && { backgroundColor: "#DCFCE7" },
        tone === "gold" && { backgroundColor: "#FEF3C7" },
      ]}
    >
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

export function LangToggle({
  lang,
  onChange,
}: {
  lang: "de" | "en";
  onChange: (l: "de" | "en") => void;
}) {
  return (
    <View style={styles.langRow}>
      {(["de", "en"] as const).map((l) => (
        <Pressable key={l} testID={`lang-${l}`} onPress={() => onChange(l)}>
          <Text style={[styles.langText, lang === l && styles.langActive]}>{l.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function HLogo({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.logo, { width: size, height: size, borderRadius: size * 0.24 }]}>
      <Text style={[styles.logoText, { fontSize: size * 0.6 }]}>H</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.sm,
    ...shadow.card,
  },
  cardPressed: { opacity: 0.82 },
  h1: { fontSize: font.h1, fontFamily: fonts.display, color: colors.text, lineHeight: 38 },
  h2: { fontSize: font.h2, fontFamily: fonts.display, color: colors.text, lineHeight: 30 },
  body: { fontSize: font.body, fontFamily: fonts.body, color: colors.text, lineHeight: 24 },
  muted: { fontSize: font.small, fontFamily: fonts.body, color: colors.textMuted, lineHeight: 18 },
  btn: { paddingVertical: space.lg, paddingHorizontal: space.lg, borderRadius: radius.lg, alignItems: "center" },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  btnGhost: { backgroundColor: "transparent" },
  btnDisabled: { opacity: 0.45 },
  btnPressed: { opacity: 0.85 },
  btnText: { color: "#FFFFFF", fontFamily: fonts.bodyBold, fontSize: font.body },
  pill: { backgroundColor: colors.background, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10, alignSelf: "flex-start" },
  pillText: { fontSize: font.small, color: colors.text, fontFamily: fonts.bodyBold },
  progressTrack: { height: 10, backgroundColor: colors.border, borderRadius: radius.pill, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.secondary },
  logo: { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  logoText: { color: colors.secondary, fontWeight: "800" },
  langRow: { flexDirection: "row", gap: space.sm },
  langText: { fontSize: font.small, color: colors.textMuted, fontWeight: "700" },
  langActive: { color: colors.primary, textDecorationLine: "underline" },
});
