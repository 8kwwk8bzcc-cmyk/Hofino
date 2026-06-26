import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Svg, { Path, Polygon, Rect } from "react-native-svg";
import { font, fonts, radius, shadow, space, type Palette } from "../theme.js";
import { useColors, useThemedStyles, useTheme } from "../theme/ThemeProvider.js";

// ── Karte ────────────────────────────────────────────────────────────────
export function Card({
  children,
  style,
  onPress,
  testID,
  tone = "surface",
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  testID?: string;
  tone?: "surface" | "navy" | "mint" | "softBlue" | "goldSoft";
}) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const toneStyle: ViewStyle =
    tone === "navy"
      ? { backgroundColor: c.navy, borderColor: c.navy }
      : tone === "mint"
        ? { backgroundColor: c.mint, borderColor: c.mint }
        : tone === "softBlue"
          ? { backgroundColor: c.softBlue, borderColor: c.softBlue }
          : tone === "goldSoft"
            ? { backgroundColor: c.goldSoft, borderColor: c.goldSoft }
            : {};
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [s.card, toneStyle, style, pressed && s.cardPressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, toneStyle, style]}>{children}</View>;
}

// ── Typografie ───────────────────────────────────────────────────────────
export function H1({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[useThemedStyles(makeStyles).h1, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[useThemedStyles(makeStyles).h2, style]}>{children}</Text>;
}
export function H3({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[useThemedStyles(makeStyles).h3, style]}>{children}</Text>;
}
export function Body({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[useThemedStyles(makeStyles).body, style]}>{children}</Text>;
}
export function BodyL({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[useThemedStyles(makeStyles).bodyL, style]}>{children}</Text>;
}
export function Muted({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[useThemedStyles(makeStyles).muted, style]}>{children}</Text>;
}
export function Caption({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[useThemedStyles(makeStyles).caption, style]}>{children}</Text>;
}
export function Overline({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[useThemedStyles(makeStyles).overline, style]}>{children}</Text>;
}

export function Divider() {
  return <View style={useThemedStyles(makeStyles).divider} />;
}

// ── Button ───────────────────────────────────────────────────────────────
export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  testID,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "accent" | "secondary" | "ghost";
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
}) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const textColor =
    variant === "secondary" ? c.navy : variant === "ghost" ? c.green : "#FFFFFF";
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        variant === "primary" && s.btnPrimary,
        variant === "accent" && s.btnAccent,
        variant === "secondary" && s.btnSecondary,
        variant === "ghost" && s.btnGhost,
        disabled && s.btnDisabled,
        pressed && !disabled && s.btnPressed,
        style,
      ]}
    >
      <Text style={[s.btnText, { color: disabled ? "#FFFFFF" : textColor }]}>
        {title}
        {variant === "ghost" ? " ›" : ""}
      </Text>
    </Pressable>
  );
}

// ── Pill / Badge ───────────────────────────────────────────────────────────
export type PillTone =
  | "neutral"
  | "good"
  | "mastered"
  | "box"
  | "teacher"
  | "locked"
  | "virtual"
  | "gold"
  | "xp"
  | "up"
  | "down";

export function Pill({ label, tone = "neutral" }: { label: string; tone?: PillTone }) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const map: Record<PillTone, { bg: string; fg: string; border?: string }> = {
    neutral: { bg: c.bg, fg: c.text },
    good: { bg: c.mint, fg: c.success },
    mastered: { bg: c.mint, fg: c.success },
    box: { bg: c.softBlue, fg: c.navySoft },
    teacher: { bg: c.goldSoft, fg: "#9A7A1E" },
    locked: { bg: c.bg, fg: c.muted },
    virtual: { bg: "transparent", fg: c.muted, border: c.border },
    gold: { bg: c.goldSoft, fg: "#9A7A1E" },
    xp: { bg: c.gold, fg: c.navy },
    up: { bg: c.mint, fg: c.success },
    down: { bg: c.dangerBg, fg: c.danger },
  };
  const t = map[tone];
  return (
    <View
      style={[
        s.pill,
        { backgroundColor: t.bg },
        t.border ? { borderWidth: 1, borderColor: t.border } : null,
      ]}
    >
      <Text style={[s.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

// ── Progress ───────────────────────────────────────────────────────────────
export function ProgressBar({
  value,
  variant = "green",
}: {
  value: number;
  variant?: "green" | "gold";
}) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={s.progressTrack}>
      <View
        style={[
          s.progressFill,
          { width: `${pct * 100}%`, backgroundColor: variant === "gold" ? c.gold : c.green },
        ]}
      />
    </View>
  );
}

// Frage-Schritte: n Segmente, gefüllt = grün.
export function StepProgress({ total, filled }: { total: number; filled: number }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 6,
            borderRadius: radius.pill,
            backgroundColor: i < filled ? c.green : c.border,
          }}
        />
      ))}
    </View>
  );
}

// ── Eingabefeld ──────────────────────────────────────────────────────────
export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  testID,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
  testID?: string;
}) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Overline>{label}</Overline> : null}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.faint}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          s.input,
          focused && { borderColor: c.green, borderWidth: 2 },
          error ? { borderColor: c.danger } : null,
        ]}
      />
      {error ? <Text style={s.inputError}>{error}</Text> : null}
    </View>
  );
}

// ── Listenzeile ────────────────────────────────────────────────────────────
export function ListRow({
  title,
  sub,
  value,
  valueSub,
  valueTone = "neutral",
  leading,
  onPress,
  testID,
}: {
  title: string;
  sub?: string;
  value?: string;
  valueSub?: string;
  valueTone?: "neutral" | "up" | "down";
  leading?: React.ReactNode;
  onPress?: () => void;
  testID?: string;
}) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const valueColor = valueTone === "up" ? c.success : valueTone === "down" ? c.danger : c.text;
  const Wrap: React.ComponentType<{ children: React.ReactNode }> = onPress
    ? ({ children }) => (
        <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
          {children}
        </Pressable>
      )
    : ({ children }) => (
        <View testID={testID} style={s.row}>
          {children}
        </View>
      );
  return (
    <Wrap>
      {leading ? <View style={s.rowLeading}>{leading}</View> : null}
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      {value ? (
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[s.rowValue, { color: valueColor }]}>{value}</Text>
          {valueSub ? <Text style={[s.rowValueSub, { color: valueColor }]}>{valueSub}</Text> : null}
        </View>
      ) : null}
    </Wrap>
  );
}

// ── Belohnungs-Moment ───────────────────────────────────────────────────────
export function RewardMoment({
  title,
  detail,
  xp,
}: {
  title: string;
  detail?: string;
  xp?: number;
}) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.reward}>
      <View style={s.rewardCheck}>
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 12.5l5 5 11-11" />
        </Svg>
      </View>
      <Text style={s.rewardTitle}>{title}</Text>
      {detail ? <Text style={s.rewardDetail}>{detail}</Text> : null}
      {xp != null ? <Pill label={`+${xp} XP`} tone="xp" /> : null}
    </View>
  );
}

// ── Sprach- & Theme-Umschalter ───────────────────────────────────────────────
export function LangToggle({ lang, onChange }: { lang: "de" | "en"; onChange: (l: "de" | "en") => void }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.langRow}>
      {(["de", "en"] as const).map((l) => (
        <Pressable key={l} testID={`lang-${l}`} onPress={() => onChange(l)}>
          <Text style={[s.langText, lang === l && s.langActive]}>{l.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const c = useColors();
  const dark = mode === "dark";
  return (
    <Pressable testID="theme-toggle" onPress={toggle} hitSlop={8}>
      {dark ? (
        // Sonne (zu Light wechseln)
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth={2} strokeLinecap="round">
          <Path d="M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" />
          <Path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" fill={c.muted} stroke="none" />
        </Svg>
      ) : (
        // Mond (zu Dark wechseln)
        <Svg width={20} height={20} viewBox="0 0 24 24" fill={c.muted} stroke="none">
          <Path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z" />
        </Svg>
      )}
    </Pressable>
  );
}

// ── Logo (H + Gold-Wachstumspfeil) ───────────────────────────────────────────
export function HLogo({ size = 40 }: { size?: number }) {
  const c = useColors();
  const r = size * 0.22;
  const navy = "#0E2A47"; // Logo-Kachel bleibt navy (Markenkonstante, auch im Dark)
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={0} y={0} width={100} height={100} rx={r * (100 / size)} fill={navy} />
      {/* H */}
      <Path d="M32 28 V72 M68 28 V72 M32 50 H68" stroke="#34B97E" strokeWidth={9} strokeLinecap="round" fill="none" />
      {/* Gold-Wachstumspfeil über dem H, ca. -30° */}
      <Path d="M30 64 L72 40" stroke={c.gold} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Polygon points="72,40 60,40 68,52" fill={c.gold} />
    </Svg>
  );
}

// ── Styles-Factory (theme-abhängig) ─────────────────────────────────────────
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.card,
      padding: 20,
      borderWidth: 1,
      borderColor: c.border,
      gap: space.sm,
      ...shadow.md,
    },
    cardPressed: { opacity: 0.85 },
    divider: { height: 1, backgroundColor: c.border, marginVertical: space.sm },
    h1: { fontSize: font.h1, fontFamily: fonts.display, color: c.text, lineHeight: 34 },
    h2: { fontSize: font.h2, fontFamily: fonts.display, color: c.text, lineHeight: 28 },
    h3: { fontSize: font.h3, fontFamily: fonts.display, color: c.text, lineHeight: 24 },
    bodyL: { fontSize: font.bodyL, fontFamily: fonts.body, color: c.text, lineHeight: 24 },
    body: { fontSize: font.body, fontFamily: fonts.body, color: c.text, lineHeight: 21 },
    muted: { fontSize: font.body, fontFamily: fonts.body, color: c.muted, lineHeight: 21 },
    caption: { fontSize: font.caption, fontFamily: fonts.bodyMed, color: c.faint, lineHeight: 17 },
    overline: {
      fontSize: font.overline,
      fontFamily: fonts.bodySemi,
      color: c.muted,
      letterSpacing: 0.9,
      textTransform: "uppercase",
    },
    btn: {
      paddingVertical: 14,
      paddingHorizontal: space.lg,
      borderRadius: radius.button,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
    },
    btnPrimary: { backgroundColor: c.navy },
    btnAccent: { backgroundColor: c.green },
    btnSecondary: { backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.border },
    btnGhost: { backgroundColor: "transparent", paddingHorizontal: 0, minHeight: 0, alignItems: "flex-start" },
    btnDisabled: { backgroundColor: "#C7D2DC" },
    btnPressed: { opacity: 0.88 },
    btnText: { fontFamily: fonts.bodyBold, fontSize: 15 },
    pill: {
      borderRadius: radius.pill,
      paddingVertical: 7,
      paddingHorizontal: 14,
      alignSelf: "flex-start",
    },
    pillText: { fontSize: 13, fontFamily: fonts.bodySemi },
    progressTrack: { height: 10, backgroundColor: c.border, borderRadius: radius.pill, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: radius.pill },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: radius.input,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 15,
      fontFamily: fonts.body,
      color: c.text,
    },
    inputError: { color: c.danger, fontSize: 12, fontFamily: fonts.body },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
    rowLeading: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.softBlue,
      alignItems: "center",
      justifyContent: "center",
    },
    rowTitle: { fontSize: 15, fontFamily: fonts.bodyBold, color: c.text },
    rowSub: { fontSize: font.caption, fontFamily: fonts.body, color: c.faint },
    rowValue: { fontSize: 15, fontFamily: fonts.display },
    rowValueSub: { fontSize: font.caption, fontFamily: fonts.bodyMed },
    reward: {
      backgroundColor: c.mint,
      borderRadius: 18,
      padding: 20,
      alignItems: "center",
      gap: 10,
    },
    rewardCheck: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.green,
      alignItems: "center",
      justifyContent: "center",
    },
    rewardTitle: { fontSize: font.h3, fontFamily: fonts.display, color: c.text },
    rewardDetail: { fontSize: font.body, fontFamily: fonts.body, color: c.muted, textAlign: "center" },
    langRow: { flexDirection: "row", gap: space.sm },
    langText: { fontSize: font.small, color: c.muted, fontFamily: fonts.bodyBold },
    langActive: { color: c.text, textDecorationLine: "underline" },
  });
