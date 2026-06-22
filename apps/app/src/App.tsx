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
import { colors, space } from "./theme.js";

type TabId = "home" | "learn" | "depot" | "discover" | "rankings";

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "Zuhause" },
  { id: "learn", icon: "📚", label: "Lernen" },
  { id: "depot", icon: "💼", label: "Depot" },
  { id: "discover", icon: "🔍", label: "Entdecken" },
  { id: "rankings", icon: "🏆", label: "Ligen" },
];

function Main() {
  const { signOut, state } = useStore();
  const [tab, setTab] = useState<TabId>("home");
  const isAdult = state.role === "adult";

  return (
    <View style={styles.shell}>
      <View style={styles.topbar}>
        <Text style={styles.brand}>Hofino{isAdult ? " · Erwachsene" : ""}</Text>
        <Pressable testID="logout" onPress={signOut}>
          <Text style={styles.logout}>Abmelden</Text>
        </Pressable>
      </View>
      <View style={styles.screen}>
        {tab === "home" && (isAdult ? <AdultHome /> : <Home />)}
        {tab === "learn" && <Learn />}
        {tab === "depot" && <Depot />}
        {tab === "discover" && <Discover />}
        {tab === "rankings" && <Rankings />}
      </View>
      <View style={styles.tabbar}>
        {TABS.map((t) => {
          const active = t.id === tab;
          const label = t.id === "home" && isAdult ? "Übersicht" : t.label;
          return (
            <Pressable key={t.id} testID={`tab-${t.id}`} onPress={() => setTab(t.id)} style={styles.tab}>
              <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{t.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
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
