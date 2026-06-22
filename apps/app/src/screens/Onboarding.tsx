import React, { useState } from "react";
import { ScrollView, StyleSheet, TextInput, View, Text, Pressable } from "react-native";
import { formatEuros, START_CAPITAL_CENTS } from "@hofino/core";
import { useStore } from "../store/store.js";
import { Body, Button, H1, HLogo, Muted } from "../ui/components.js";
import { colors, font, radius, space } from "../theme.js";

const PLOTS = [
  { id: "wald", emoji: "🌲", label: "Wiese am Waldrand" },
  { id: "see", emoji: "🏞️", label: "Grundstück am See" },
  { id: "stadt", emoji: "🏙️", label: "Platz in der Stadt" },
];

export function Onboarding() {
  const { onboard } = useStore();
  const [name, setName] = useState("");
  const [plot, setPlot] = useState("");

  const canStart = name.trim().length >= 2 && plot !== "";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <HLogo size={64} />
        <H1>Willkommen bei Hofino</H1>
        <Muted>Geld verstehen. Investieren üben.</Muted>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Wie möchtest du heißen?</Text>
        <TextInput
          testID="name-input"
          value={name}
          onChangeText={setName}
          placeholder="Dein Anzeigename (kein echter Name nötig)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          maxLength={20}
        />
        <Muted>Du brauchst keinen echten Namen anzugeben.</Muted>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Wähle dein Grundstück</Text>
        {PLOTS.map((p) => (
          <Pressable
            key={p.id}
            testID={`plot-${p.id}`}
            onPress={() => setPlot(p.id)}
            style={[styles.plot, plot === p.id && styles.plotActive]}
          >
            <Text style={styles.plotEmoji}>{p.emoji}</Text>
            <Text style={styles.plotLabel}>{p.label}</Text>
            {plot === p.id && <Text style={styles.check}>✓</Text>}
          </Pressable>
        ))}
      </View>

      <View style={styles.startBlock}>
        <Body>
          Zum Start bekommst du <Text style={{ fontWeight: "800" }}>{formatEuros(START_CAPITAL_CENTS)}</Text>{" "}
          virtuelles Übungsgeld – kein echtes Geld.
        </Body>
        <Button
          testID="start-button"
          title="Los geht's"
          onPress={() => canStart && onboard(name.trim(), plot)}
          disabled={!canStart}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.xl, gap: space.xl, backgroundColor: colors.background, flexGrow: 1 },
  header: { alignItems: "center", gap: space.sm, marginTop: space.xl },
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
  startBlock: { gap: space.md, marginTop: "auto" },
});
