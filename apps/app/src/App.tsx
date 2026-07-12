import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useFonts,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from "@expo-google-fonts/hanken-grotesk";
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { StoreProvider, useStore } from "./store/store.js";
import { ConsentBlocked, NewPassword, Onboarding, ProfileSetup } from "./screens/Onboarding.js";
import { DevLogin } from "./screens/DevLogin.js";
import { DEV_LOGIN } from "./config/flags.js";
import { Start } from "./screens/Start.js";
import { WelcomeTutorial } from "./screens/WelcomeTutorial.js";
import { Discover } from "./screens/Discover.js";
import { Depot } from "./screens/Depot.js";
import { Rankings } from "./screens/Rankings.js";
import { LearnPlus } from "./screens/LearnPlus.js";
import { FamilyHome } from "./screens/family/FamilyHome.js";
import { FamilyLink } from "./screens/family/FamilyLink.js";
import { TeacherClass } from "./screens/classroom/TeacherClass.js";
import { TeacherBeamer } from "./screens/classroom/TeacherBeamer.js";
import { Button, LangToggle, ThemeToggle } from "./ui/components.js";
import { ToastProvider } from "./ui/Toast.js";
import {
  IconBeamer,
  IconClass,
  IconDepot,
  IconFamily,
  IconLeague,
  IconLearn,
  IconLink,
  IconStart,
  IconValues,
  type IconProps,
} from "./ui/icons.js";
import { translate } from "./i18n.js";
import { NavContext, type NavOpts } from "./nav.js";
import { fonts, space, type Palette } from "./theme.js";
import { ThemeProvider, useColors, useTheme, useThemedStyles } from "./theme/ThemeProvider.js";

type IconCmp = (p: IconProps) => React.JSX.Element;

function TopBar({ brand }: { brand: string }) {
  const { signOut, lang, setLang } = useStore();
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.topbar}>
      <Text style={s.brand}>{brand}</Text>
      <View style={s.topbarRight}>
        <ThemeToggle />
        <LangToggle lang={lang} onChange={setLang} />
        <Pressable testID="logout" onPress={signOut}>
          <Text style={s.logout}>{translate(lang, "common.logout")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

type TabId = "start" | "learn" | "depot" | "values" | "league";

const TABS: { id: TabId; Icon: IconCmp }[] = [
  { id: "start", Icon: IconStart },
  { id: "learn", Icon: IconLearn },
  { id: "depot", Icon: IconDepot },
  { id: "values", Icon: IconValues },
  { id: "league", Icon: IconLeague },
];

function TabBar<T extends string>({
  tabs,
  active,
  onSelect,
  labelFor,
}: {
  tabs: { id: T; Icon: IconCmp }[];
  active: T;
  onSelect: (id: T) => void;
  labelFor: (id: T) => string;
}) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.tabbar}>
      {tabs.map((item) => {
        const isActive = item.id === active;
        const color = isActive ? c.green : c.faint;
        return (
          <Pressable key={item.id} testID={`tab-${item.id}`} onPress={() => onSelect(item.id)} style={s.tab}>
            <item.Icon size={24} color={color} filled={isActive} />
            <Text style={[s.tabLabel, { color }, isActive && s.tabLabelActive]}>{labelFor(item.id)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Main() {
  const { state, t, completeTutorial } = useStore();
  const [tab, setTab] = useState<TabId>("start");
  const [focusInstrument, setFocusInstrument] = useState<string | undefined>(undefined);
  const isAdult = state.role === "adult";
  const s = useThemedStyles(makeStyles);

  const navigate = (id: TabId, opts?: NavOpts) => {
    setTab(id);
    if (opts?.instrumentId) setFocusInstrument(opts.instrumentId);
  };

  return (
    <View style={s.shell}>
      <TopBar brand={isAdult ? t("brand.adult") : "Hofino"} />
      <NavContext.Provider value={navigate}>
        <View style={s.screen}>
          {tab === "start" && <Start />}
          {tab === "learn" && <LearnPlus />}
          {tab === "depot" && <Depot />}
          {tab === "values" && (
            <Discover focusInstrument={focusInstrument} onFocusConsumed={() => setFocusInstrument(undefined)} />
          )}
          {tab === "league" && <Rankings />}
        </View>
      </NavContext.Provider>
      <TabBar
        tabs={TABS}
        active={tab}
        onSelect={setTab}
        labelFor={(id) => (id === "start" && isAdult ? t("tab.overview") : t(`tab.${id}`))}
      />
      {!state.tutorialDone && (
        <WelcomeTutorial
          onFinish={() => {
            completeTutorial();
            setTab("start");
          }}
          onSkip={completeTutorial}
        />
      )}
    </View>
  );
}

type ParentTab = "family" | "link";
const PARENT_TABS: { id: ParentTab; Icon: IconCmp }[] = [
  { id: "family", Icon: IconFamily },
  { id: "link", Icon: IconLink },
];

function ParentShell() {
  const { t } = useStore();
  const [tab, setTab] = useState<ParentTab>("family");
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.shell}>
      <TopBar brand={t("brand.parent")} />
      <View style={s.screen}>
        {tab === "family" && <FamilyHome />}
        {tab === "link" && <FamilyLink />}
      </View>
      <TabBar tabs={PARENT_TABS} active={tab} onSelect={setTab} labelFor={(id) => t(`tab.${id}`)} />
    </View>
  );
}

type TeacherTab = "class" | "beamer";
const TEACHER_TABS: { id: TeacherTab; Icon: IconCmp }[] = [
  { id: "class", Icon: IconClass },
  { id: "beamer", Icon: IconBeamer },
];

function TeacherShell() {
  const { t } = useStore();
  const [tab, setTab] = useState<TeacherTab>("class");
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.shell}>
      <TopBar brand={t("brand.teacher")} />
      <View style={s.screen}>
        {tab === "class" && <TeacherClass />}
        {tab === "beamer" && <TeacherBeamer />}
      </View>
      <TabBar tabs={TEACHER_TABS} active={tab} onSelect={setTab} labelFor={(id) => t(`tab.${id}`)} />
    </View>
  );
}

// Auth-Einstieg: mit DEV_LOGIN sind Personas UND die echte Anmeldung erreichbar
// (Umschalter), ohne Flag gibt es nur die echte Anmeldung.
function AuthEntry() {
  const [real, setReal] = useState(!DEV_LOGIN);
  if (!real) return <DevLogin onRealAuth={() => setReal(true)} />;
  return (
    <Onboarding
      footer={
        DEV_LOGIN ? (
          <Button title="Zurück zum Entwickler-Login" variant="ghost" onPress={() => setReal(false)} />
        ) : undefined
      }
    />
  );
}

function Gate() {
  const { state } = useStore();
  const c = useColors();
  if (state.loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.green} />
      </View>
    );
  }
  if (!state.hasSession) return <AuthEntry />;
  if (state.passwordRecovery) return <NewPassword />;
  if (!state.onboarded) return <ProfileSetup />;
  if (state.consentStatus === "blocked") return <ConsentBlocked />;
  if (state.role === "parent") return <ParentShell />;
  if (state.role === "teacher") return <TeacherShell />;
  return <Main />;
}

function Root({ fontsLoaded }: { fontsLoaded: boolean }) {
  const c = useColors();
  const { mode } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} />
      {fontsLoaded ? (
        <StoreProvider>
          <ToastProvider>
            <Gate />
          </ToastProvider>
        </StoreProvider>
      ) : (
        <View style={[styles.center, { backgroundColor: c.bg }]}>
          <ActivityIndicator color={c.green} />
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });
  return (
    <ThemeProvider>
      <Root fontsLoaded={fontsLoaded} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: Platform.OS === "android" ? 24 : 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    shell: { flex: 1, backgroundColor: c.bg },
    screen: { flex: 1 },
    topbar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.surface,
    },
    brand: { fontFamily: fonts.display, color: c.navy, fontSize: 18 },
    topbarRight: { flexDirection: "row", alignItems: "center", gap: space.lg },
    logout: { color: c.muted, fontFamily: fonts.body, fontSize: 13 },
    tabbar: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.surface,
      paddingBottom: space.sm,
      paddingTop: space.sm,
      height: 74,
    },
    tab: { flex: 1, alignItems: "center", gap: 4, justifyContent: "center" },
    tabLabel: { fontSize: 10.5, fontFamily: fonts.body },
    tabLabelActive: { fontFamily: fonts.bodyBold },
  });
