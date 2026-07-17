import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { formatEuros, START_CAPITAL_CENTS } from "@hofino/core";
import { useStore } from "../store/store.js";
import { LegalLinks } from "./LegalLinks.js";
import { Body, Button, H1, HLogo, LangToggle, Muted } from "../ui/components.js";
import { FLAGS } from "../config/flags.js";
import { font, fonts, radius, space, type Palette } from "../theme.js";
import { useColors, useThemedStyles } from "../theme/ThemeProvider.js";

const PLOTS = [
  { id: "wald", emoji: "🌲" },
  { id: "see", emoji: "🏞️" },
  { id: "stadt", emoji: "🏙️" },
];

function NameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useStore();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{t("auth.name")}</Text>
      <TextInput
        testID="name-input"
        value={value}
        onChangeText={onChange}
        placeholder={t("auth.namePlaceholder")}
        placeholderTextColor={c.muted}
        style={styles.input}
        maxLength={20}
      />
    </View>
  );
}

function PlotPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useStore();
  const styles = useThemedStyles(makeStyles);
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
  emailPlaceholder,
}: {
  email: string;
  password: string;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  emailPlaceholder?: string;
}) {
  const { t } = useStore();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.block}>
      <TextInput
        testID="email-input"
        value={email}
        onChangeText={onEmail}
        placeholder={emailPlaceholder ?? t("auth.email")}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor={c.muted}
        style={styles.input}
      />
      <TextInput
        testID="password-input"
        value={password}
        onChangeText={onPassword}
        placeholder={t("auth.password")}
        secureTextEntry
        placeholderTextColor={c.muted}
        style={styles.input}
      />
    </View>
  );
}

type RegRole = "child" | "student" | "adult" | "parent" | "teacher";
// Zweistufige Auswahl: oben nur drei Basis-Rollen, Schüler:in steckt als
// Nachfrage hinter „Jugendliche:r", Eltern hinter „Erwachsene:r".
type BaseRole = "child" | "adult" | "teacher";
const BASE_ROLES: BaseRole[] = ["child", "adult", "teacher"];
const baseOf = (r: RegRole): BaseRole => (r === "student" ? "child" : r === "parent" ? "adult" : r);

function YesNo({
  value,
  onChange,
  testID,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  testID: string;
}) {
  const { t } = useStore();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.tabs}>
      {([true, false] as const).map((v) => (
        <Pressable
          key={String(v)}
          testID={`${testID}-${v ? "yes" : "no"}`}
          onPress={() => onChange(v)}
          style={[styles.tab, value === v && styles.tabActive]}
        >
          <Text style={[styles.tabText, value === v && styles.tabTextActive]}>
            {t(v ? "common.yes" : "common.no")}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function RolePicker({
  role,
  onChange,
  exclude = [],
}: {
  role: RegRole;
  onChange: (r: RegRole) => void;
  exclude?: RegRole[];
}) {
  const { t } = useStore();
  const styles = useThemedStyles(makeStyles);
  const base = baseOf(role);
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{t("auth.roleQuestion")}</Text>
      <View style={styles.tabs}>
        {BASE_ROLES.map((b) => (
          <Pressable
            key={b}
            testID={`role-${b}`}
            onPress={() => onChange(b)}
            style={[styles.tab, base === b && styles.tabActive]}
          >
            <Text style={[styles.tabText, base === b && styles.tabTextActive]}>{t(`role.${b}`)}</Text>
          </Pressable>
        ))}
      </View>
      {base === "child" && !exclude.includes("student") && (
        <>
          <Muted>{t("auth.studentFollowup")}</Muted>
          <YesNo
            testID="followup-student"
            value={role === "student"}
            onChange={(v) => onChange(v ? "student" : "child")}
          />
        </>
      )}
      {base === "adult" && !exclude.includes("parent") && (
        <>
          <Muted>{t("auth.parentFollowup")}</Muted>
          <YesNo
            testID="followup-parent"
            value={role === "parent"}
            onChange={(v) => onChange(v ? "parent" : "adult")}
          />
        </>
      )}
    </View>
  );
}

export function Onboarding({ footer }: { footer?: React.ReactNode }) {
  const { register, login, resetPassword, t, lang, setLang } = useStore();
  const styles = useThemedStyles(makeStyles);
  const [mode, setMode] = useState<"register" | "login">("register");
  const [role, setRole] = useState<RegRole>("child");
  const [name, setName] = useState("");
  const [plot, setPlot] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailOk = /.+@.+\..+/.test(email);
  // Anmelden geht auch mit Spitzname (Kinderkonten, kein @)
  const nickOk = !email.includes("@") && email.trim().length >= 2;
  const plotOk = !FLAGS.house_enabled || role !== "child" || plot !== "";
  // Schueler: `email` ist der Klassencode (6 Zeichen), keine E-Mail noetig.
  const credentialOk = role === "student" && mode === "register" ? email.trim().length >= 6 : emailOk;
  const canRegister = name.trim().length >= 2 && plotOk && credentialOk && password.length >= 6;
  const canLogin = (emailOk || nickOk) && password.length >= 6;

  const submit = async () => {
    setError(null);
    setInfo(null);
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
          <RolePicker role={role} onChange={setRole} />
          <NameInput value={name} onChange={setName} />
          {(role === "child" || role === "student") && <Muted>{t("auth.childNickHint")}</Muted>}
          {FLAGS.house_enabled && role === "child" && <PlotPicker value={plot} onChange={setPlot} />}
        </>
      )}
      <Credentials
        email={email}
        password={password}
        onEmail={setEmail}
        onPassword={setPassword}
        emailPlaceholder={
          mode === "login"
            ? t("auth.loginId")
            : role === "child"
              ? t("auth.parentEmail")
              : role === "student"
                ? t("auth.classCode")
                : undefined
        }
      />

      {error && <Text style={styles.error}>{error}</Text>}
      {info && <Body>{info}</Body>}

      {mode === "login" && (
        <Button
          testID="forgot-password"
          title={t("auth.forgot")}
          variant="ghost"
          disabled={!emailOk || busy}
          onPress={async () => {
            setError(null);
            const r = await resetPassword(email.trim());
            if (r.ok) setInfo(t("auth.resetSent"));
            else setError(r.message);
          }}
        />
      )}

      {mode === "register" && role === "child" && <Body>{t("auth.childConsentNote")}</Body>}
      {mode === "register" && role === "student" && <Body>{t("auth.studentNote")}</Body>}
      {mode === "register" && (role === "child" || role === "adult") && (
        <Body>{t("auth.startCapitalNote", { amount: formatEuros(START_CAPITAL_CENTS) })}</Body>
      )}
      {mode === "register" && role === "parent" && (
        <Body>{t("auth.parentNote")}</Body>
      )}
      {mode === "register" && role === "teacher" && (
        <Body>{t("auth.teacherNote")}</Body>
      )}

      <Button
        testID="start-button"
        title={busy ? t("auth.wait") : mode === "register" ? t("auth.start") : t("auth.signin")}
        onPress={submit}
        disabled={busy || (mode === "register" ? !canRegister : !canLogin)}
      />
      {footer}
      <LegalLinks />
    </ScrollView>
  );
}

/** Sperrbildschirm: Kinderkonto ohne Eltern-Bestätigung nach Fristablauf. */
export function ConsentBlocked() {
  const { requestConsentMail, signOut, t } = useStore();
  const styles = useThemedStyles(makeStyles);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <HLogo size={56} />
        <H1>{t("consent.blockedTitle")}</H1>
      </View>
      <Body>{t("consent.blockedText")}</Body>
      {info && <Body>{info}</Body>}
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        testID="consent-resend"
        title={t("consent.resend")}
        onPress={async () => {
          setError(null);
          const r = await requestConsentMail();
          if (r.ok) setInfo(t("consent.resendDone"));
          else setError(r.message);
        }}
      />
      <Button title={t("auth.signout")} variant="ghost" onPress={signOut} />
    </ScrollView>
  );
}

/** Wird angezeigt, wenn der Nutzer ueber einen Passwort-Reset-Link kam. */
export function NewPassword() {
  const { updatePassword, signOut, t } = useStore();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <HLogo size={56} />
        <H1>{t("auth.newPasswordTitle")}</H1>
      </View>
      <TextInput
        testID="new-password-input"
        value={password}
        onChangeText={setPassword}
        placeholder={t("auth.password")}
        secureTextEntry
        placeholderTextColor={c.muted}
        style={styles.input}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        testID="new-password-save"
        title={busy ? t("auth.wait") : t("auth.newPasswordSave")}
        disabled={busy || password.length < 6}
        onPress={async () => {
          setError(null);
          setBusy(true);
          const r = await updatePassword(password);
          setBusy(false);
          if (!r.ok) setError(r.message);
        }}
      />
      <Button title={t("auth.signout")} variant="ghost" onPress={signOut} />
    </ScrollView>
  );
}

export function ProfileSetup() {
  const { createProfile, signOut, t } = useStore();
  const styles = useThemedStyles(makeStyles);
  const [role, setRole] = useState<RegRole>("child");
  const [name, setName] = useState("");
  const [plot, setPlot] = useState("");
  const [error, setError] = useState<string | null>(null);

  const plotOk = !FLAGS.house_enabled || role !== "child" || plot !== "";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <HLogo size={56} />
        <H1>{t("auth.profileSetupTitle")}</H1>
      </View>
      <RolePicker role={role} onChange={setRole} exclude={["student"]} />
      <NameInput value={name} onChange={setName} />
      {FLAGS.house_enabled && role === "child" && <PlotPicker value={plot} onChange={setPlot} />}
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        testID="create-profile"
        title={t("auth.next")}
        disabled={name.trim().length < 2 || !plotOk}
        onPress={async () => {
          const r = await createProfile(name.trim(), role === "child" ? plot : "", role);
          if (!r.ok) setError(r.message);
        }}
      />
      <Button title={t("auth.signout")} variant="ghost" onPress={signOut} />
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { padding: space.xl, gap: space.lg, backgroundColor: c.bg, flexGrow: 1 },
    header: { alignItems: "center", gap: space.sm, marginTop: space.lg },
    tabs: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    // flexBasis statt flex:1, damit die 5 Rollen-Chips auf schmalen Screens
    // umbrechen statt sich zu quetschen (flexWrap greift nur mit Mindestbreite).
    tab: { flexGrow: 1, flexBasis: 104, padding: space.md, borderRadius: radius.md, alignItems: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    tabActive: { borderColor: c.navy, backgroundColor: c.navy },
    tabText: { fontWeight: "700", fontFamily: fonts.bodyBold, color: c.navy },
    tabTextActive: { color: "#FFFFFF" },
    block: { gap: space.sm },
    label: { fontSize: font.h3, fontWeight: "700", fontFamily: fonts.bodyBold, color: c.text },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: space.md,
      fontSize: font.body,
      fontFamily: fonts.body,
      color: c.text,
      backgroundColor: c.surface,
    },
    plot: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
      padding: space.md,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    plotActive: { borderColor: c.green, backgroundColor: c.mint },
    plotEmoji: { fontSize: 28, fontFamily: fonts.body },
    plotLabel: { flex: 1, fontSize: font.body, fontWeight: "600", fontFamily: fonts.body, color: c.text },
    check: { color: c.green, fontWeight: "800", fontFamily: fonts.bodyBold, fontSize: font.h3 },
    error: { color: c.danger, fontWeight: "600", fontFamily: fonts.body, fontSize: font.small },
  });
