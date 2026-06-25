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
import { Rankings } from "./screens/Rankings.js";
import { LearnPlus } from "./screens/LearnPlus.js";
import { FamilyHome } from "./screens/family/FamilyHome.js";
import { FamilyLink } from "./screens/family/FamilyLink.js";
import { TeacherClass } from "./screens/classroom/TeacherClass.js";
import { TeacherBeamer } from "./screens/classroom/TeacherBeamer.js";
import { LangToggle } from "./ui/components.js";
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
import { NavContext } from "./nav.js";
import { colors, space } from "./theme.js";

type IconCmp = (p: IconProps) => React.JSX.Element;

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
  return (
    <View style={styles.tabbar}>
      {tabs.map((item) => {
        const isActive = item.id === active;
        const color = isActive ? colors.secondary : colors.textMuted;
        return (
          <Pressable key={item.id} testID={`tab-${item.id}`} onPress={() => onSelect(item.id)} style={styles.tab}>
            <item.Icon size={24} color={color} />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{labelFor(item.id)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Main() {
  const { state, t } = useStore();
  const [tab, setTab] = useState<TabId>("start");
  const isAdult = state.role === "adult";

  return (
    <View style={styles.shell}>
      <TopBar brand={isAdult ? t("brand.adult") : "Hofino"} />
      <NavContext.Provider value={setTab}>
        <View style={styles.screen}>
          {tab === "start" && (isAdult ? <AdultHome /> : <Home />)}
          {tab === "learn" && <LearnPlus />}
          {tab === "depot" && <Depot />}
          {tab === "values" && <Discover />}
          {tab === "league" && <Rankings />}
        </View>
      </NavContext.Provider>
      <TabBar
        tabs={TABS}
        active={tab}
        onSelect={setTab}
        labelFor={(id) => (id === "start" && isAdult ? t("tab.overview") : t(`tab.${id}`))}
      />
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
  return (
    <View style={styles.shell}>
      <TopBar brand={t("brand.parent")} />
      <View style={styles.screen}>
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
  return (
    <View style={styles.shell}>
      <TopBar brand={t("brand.teacher")} />
      <View style={styles.screen}>
        {tab === "class" && <TeacherClass />}
        {tab === "beamer" && <TeacherBeamer />}
      </View>
      <TabBar tabs={TEACHER_TABS} active={tab} onSelect={setTab} labelFor={(id) => t(`tab.${id}`)} />
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
  tab: { flex: 1, alignItems: "center", gap: 3 },
  tabLabel: { fontSize: 11, color: colors.textMuted },
  tabLabelActive: { color: colors.secondary, fontWeight: "700" },
});
