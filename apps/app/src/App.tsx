import React, { useState } from "react";
import { Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import { StoreProvider, useStore } from "./store/store.js";
import { Onboarding } from "./screens/Onboarding.js";
import { Home } from "./screens/Home.js";
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

function Shell() {
  const { state } = useStore();
  const [tab, setTab] = useState<TabId>("home");

  if (!state.onboarded) return <Onboarding />;

  return (
    <View style={styles.shell}>
      <View style={styles.screen}>
        {tab === "home" && <Home />}
        {tab === "learn" && <Learn />}
        {tab === "depot" && <Depot />}
        {tab === "discover" && <Discover />}
        {tab === "rankings" && <Rankings />}
      </View>
      <View style={styles.tabbar}>
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable key={t.id} testID={`tab-${t.id}`} onPress={() => setTab(t.id)} style={styles.tab}>
              <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{t.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === "android" ? 24 : 0 },
  shell: { flex: 1 },
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
