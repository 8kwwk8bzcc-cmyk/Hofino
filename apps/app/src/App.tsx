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
import { StoreProvider, useStore } from "./store/store.js";
import { Onboarding, ProfileSetup } from "./screens/Onboarding.js";
import { Home } from "./screens/Home.js";
import { AdultHome } from "./screens/AdultHome.js";
import { Discover } from "./screens/Discover.js";
import { Depot } from "./screens/Depot.js";
import { Learn } from "./screens/Learn.js";
import { Rankings } from "./screens/Rankings.js";
import { FamilyHome } from "./screens/family/FamilyHome.js";
import { FamilyLink } from "./screens/family/FamilyLink.js";
import { TeacherClass } from "./screens/classroom/TeacherClass.js";
import { TeacherBeamer } from "./screens/classroom/TeacherBeamer.js";
import { LangToggle } from "./ui/components.js";
import { translate } from "./i18n.js";
import { colors, space } from "./theme.js";

function TopBar({ brand }: { brand: string }) {
  const { signOut, lang, setLang } = useStore();
  return (
    <View style={styles.topbar}>
      <Text style={styles.brand}>{brand}</Text>
      <View style={styles.topbarRight}>
        <LangToggle lang={lang} onChange={setLang} />
        <Pressable testID="logout" onPress={signOut}>
          <Text style={styles.logout}>{translate(lang, "common.logout")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

type TabId = "home" | "learn" | "depot" | "discover" | "rankings";

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "Zuhause" },
  { id: "learn", icon: "📚", label: "Lernen" },
  { id: "depot", icon: "💼", label: "Depot" },
  { id: "discover", icon: "🔍", label: "Entdecken" },
  { id: "rankings", icon: "🏆", label: "Ligen" },
];

function Main() {
  const { state, t } = useStore();
  const [tab, setTab] = useState<TabId>("home");
  const isAdult = state.role === "adult";

  return (
    <View style={styles.shell}>
      <TopBar brand={isAdult ? t("brand.adult") : "Hofino"} />
      <View style={styles.screen}>
        {tab === "home" && (isAdult ? <AdultHome /> : <Home />)}
        {tab === "learn" && <Learn />}
        {tab === "depot" && <Depot />}
        {tab === "discover" && <Discover />}
        {tab === "rankings" && <Rankings />}
      </View>
      <View style={styles.tabbar}>
        {TABS.map((item) => {
          const active = item.id === tab;
          const label = item.id === "home" && isAdult ? t("tab.overview") : t(`tab.${item.id}`);
          return (
            <Pressable key={item.id} testID={`tab-${item.id}`} onPress={() => setTab(item.id)} style={styles.tab}>
              <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{item.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type ParentTab = "family" | "link";
const PARENT_TABS: { id: ParentTab; icon: string; label: string }[] = [
  { id: "family", icon: "👪", label: "Familie" },
  { id: "link", icon: "🔗", label: "Verknüpfen" },
];

function ParentShell() {
  const { t } = useStore();
  const [tab, setTab] = useState<ParentTab>("family");
  return (
    <View style={styles.shell}>
      <TopBar brand={t("brand.parent")} />
      <View style={styles.screen}>
        {tab === "family" && <FamilyHome />}
        {tab === "link" && <FamilyLink />}
      </View>
      <View style={styles.tabbar}>
        {PARENT_TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Pressable key={item.id} testID={`tab-${item.id}`} onPress={() => setTab(item.id)} style={styles.tab}>
              <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{item.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t(`tab.${item.id}`)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type TeacherTab = "class" | "beamer";
const TEACHER_TABS: { id: TeacherTab; icon: string; label: string }[] = [
  { id: "class", icon: "🏫", label: "Klasse" },
  { id: "beamer", icon: "📽️", label: "Beamer" },
];

function TeacherShell() {
  const { t } = useStore();
  const [tab, setTab] = useState<TeacherTab>("class");
  return (
    <View style={styles.shell}>
      <TopBar brand={t("brand.teacher")} />
      <View style={styles.screen}>
        {tab === "class" && <TeacherClass />}
        {tab === "beamer" && <TeacherBeamer />}
      </View>
      <View style={styles.tabbar}>
        {TEACHER_TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Pressable key={item.id} testID={`tab-${item.id}`} onPress={() => setTab(item.id)} style={styles.tab}>
              <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{item.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t(`tab.${item.id}`)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Gate() {
  const { state } = useStore();
  if (state.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!state.hasSession) return <Onboarding />;
  if (!state.onboarded) return <ProfileSetup />;
  if (state.role === "parent") return <ParentShell />;
  if (state.role === "teacher") return <TeacherShell />;
  return <Main />;
}

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <StoreProvider>
        <Gate />
      </StoreProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === "android" ? 24 : 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  shell: { flex: 1 },
  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  brand: { fontWeight: "800", color: colors.primary, fontSize: 16 },
  topbarRight: { flexDirection: "row", alignItems: "center", gap: space.lg },
  logout: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  screen: { flex: 1 },
  tabbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingBottom: space.sm,
    paddingTop: space.sm,
  },
  tab: { flex: 1, alignItems: "center", gap: 2 },
  tabIcon: { fontSize: 22, opacity: 0.5 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: colors.textMuted },
  tabLabelActive: { color: colors.primary, fontWeight: "700" },
});
