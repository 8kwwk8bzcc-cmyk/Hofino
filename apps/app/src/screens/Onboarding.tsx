import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { formatEuros, START_CAPITAL_CENTS } from "@hofino/core";
import { useStore } from "../store/store.js";
import { Body, Button, H1, HLogo, LangToggle, Muted } from "../ui/components.js";
import { colors, font, radius, space } from "../theme.js";

const PLOTS = [
  { id: "wald", emoji: "🌲" },
  { id: "see", emoji: "🏞️" },
  { id: "stadt", emoji: "🏙️" },
];

function NameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useStore();
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{t("auth.name")}</Text>
      <TextInput
        testID="name-input"
        value={value}
        onChangeText={onChange}
        placeholder={t("auth.namePlaceholder")}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        maxLength={20}
      />
    </View>
  );
}

function PlotPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useStore();
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{t("auth.plot")}</Text>
      {PLOTS.map((p) => (
        <Pressable
          key={p.id}
          testID={`plot-${p.id}`}
          onPress={() => onChange(p.id)}
          style={[styles.plot, value === p.id && styles.plotActive]}
        >
          <Text style={styles.plotEmoji}>{p.emoji}</Text>
          <Text style={styles.plotLabel}>{t(`plot.${p.id}`)}</Text>
          {value === p.id && <Text style={styles.check}>✓</Text>}
        </Pressable>
      ))}
    </View>
  );
}

function Credentials({
  email,
  password,
  onEmail,
  onPassword,
}: {
  email: string;
  password: string;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
}) {
  const { t } = useStore();
  return (
    <View style={styles.block}>
      <TextInput
        testID="email-input"
        value={email}
        onChangeText={onEmail}
        placeholder={t("auth.email")}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <TextInput
        testID="password-input"
        value={password}
        onChangeText={onPassword}
        placeholder={t("auth.password")}
        secureTextEntry
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
    </View>
  );
}

type RegRole = "child" | "adult" | "parent" | "teacher";
const ROLE_OPTIONS: { id: RegRole; label: string }[] = [
  { id: "child", label: "Kind (10–15)" },
  { id: "adult", label: "Erwachsene" },
  { id: "parent", label: "Eltern" },
  { id: "teacher", label: "Lehrer" },
];

function RoleToggle({ role, onChange }: { role: RegRole; onChange: (r: RegRole) => void }) {
  const { t } = useStore();
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{t("auth.roleQuestion")}</Text>
      <View style={styles.tabs}>
        {ROLE_OPTIONS.map((o) => (
          <Pressable
            key={o.id}
            testID={`role-${o.id}`}
            onPress={() => onChange(o.id)}
            style={[styles.tab, role === o.id && styles.tabActive]}
          >
            <Text style={[styles.tabText, role === o.id && styles.tabTextActive]}>{t(`role.${o.id}`)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Onboarding() {
  const { register, login, t, lang, setLang } = useStore();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [role, setRole] = useState<RegRole>("child");
  const [name, setName] = useState("");
  const [plot, setPlot] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailOk = /.+@.+\..+/.test(email);
  const plotOk = role !== "child" || plot !== "";
  const canRegister = name.trim().length >= 2 && plotOk && emailOk && password.length >= 6;
  const canLogin = emailOk && password.length >= 6;

  const submit = async () => {
    setError(null);
    setBusy(true);
    const r =
      mode === "register"
        ? await register(name.trim(), role === "child" ? plot : "", email.trim(), password, role)
        : await login(email.trim(), password);
    setBusy(false);
    if (!r.ok) setError(r.message);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ alignItems: "flex-end" }}>
        <LangToggle lang={lang} onChange={setLang} />
      </View>
      <View style={styles.header}>
        <HLogo size={64} />
        <H1>{t("auth.welcome")}</H1>
        <Muted>{t("claim")}</Muted>
      </View>

      <View style={styles.tabs}>
        <Pressable testID="mode-register" onPress={() => setMode("register")} style={[styles.tab, mode === "register" && styles.tabActive]}>
          <Text style={[styles.tabText, mode === "register" && styles.tabTextActive]}>{t("auth.new")}</Text>
        </Pressable>
        <Pressable testID="mode-login" onPress={() => setMode("login")} style={[styles.tab, mode === "login" && styles.tabActive]}>
          <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>{t("auth.login")}</Text>
        </Pressable>
      </View>

      {mode === "register" && (
        <>
          <RoleToggle role={role} onChange={setRole} />
          <NameInput value={name} onChange={setName} />
          {role === "child" && <PlotPicker value={plot} onChange={setPlot} />}
        </>
      )}
      <Credentials email={email} password={password} onEmail={setEmail} onPassword={setPassword} />

      {error && <Text style={styles.error}>{error}</Text>}

      {mode === "register" && (role === "child" || role === "adult") && (
        <Body>
          Zum Start bekommst du <Text style={{ fontWeight: "800" }}>{formatEuros(START_CAPITAL_CENTS)}</Text>{" "}
          virtuelles Übungsgeld – kein echtes Geld.
        </Body>
      )}
      {mode === "register" && role === "parent" && (
        <Body>Als Elternteil begleitest du dein Kind – du verknüpfst es nach der Anmeldung per Code.</Body>
      )}
      {mode === "register" && role === "teacher" && (
        <Body>Als Lehrer erstellst du nach der Anmeldung eine Klasse und teilst den Klassencode mit deinen Schülern.</Body>
      )}

      <Button
        testID="start-button"
        title={busy ? t("auth.wait") : mode === "register" ? t("auth.start") : t("auth.signin")}
        onPress={submit}
        disabled={busy || (mode === "register" ? !canRegister : !canLogin)}
      />
    </ScrollView>
  );
}

export function ProfileSetup() {
  const { createProfile, signOut } = useStore();
  const [role, setRole] = useState<RegRole>("child");
  const [name, setName] = useState("");
  const [plot, setPlot] = useState("");
  const [error, setError] = useState<string | null>(null);

  const plotOk = role !== "child" || plot !== "";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <HLogo size={56} />
        <H1>Profil einrichten</H1>
      </View>
      <RoleToggle role={role} onChange={setRole} />
      <NameInput value={name} onChange={setName} />
      {role === "child" && <PlotPicker value={plot} onChange={setPlot} />}
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        testID="create-profile"
        title="Weiter"
        disabled={name.trim().length < 2 || !plotOk}
        onPress={async () => {
          const r = await createProfile(name.trim(), role === "child" ? plot : "", role);
          if (!r.ok) setError(r.message);
        }}
      />
      <Button title="Abmelden" variant="ghost" onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.xl, gap: space.lg, backgroundColor: colors.background, flexGrow: 1 },
  header: { alignItems: "center", gap: space.sm, marginTop: space.lg },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  tab: { flex: 1, padding: space.md, borderRadius: radius.md, alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  tabText: { fontWeight: "700", color: colors.primary },
  tabTextActive: { color: "#FFFFFF" },
  block: { gap: space.sm },
  label: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: font.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  plot: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  plotActive: { borderColor: colors.secondary, backgroundColor: "#F0FDF4" },
  plotEmoji: { fontSize: 28 },
  plotLabel: { flex: 1, fontSize: font.body, fontWeight: "600", color: colors.text },
  check: { color: colors.secondary, fontWeight: "800", fontSize: font.h3 },
  error: { color: colors.danger, fontWeight: "600", fontSize: font.small },
});
