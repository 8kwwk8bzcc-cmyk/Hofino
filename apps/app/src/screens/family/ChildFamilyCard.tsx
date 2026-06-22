import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useStore } from "../../store/store.js";
import { Body, Button, Card, H2, Muted } from "../../ui/components.js";
import { colors, font, space } from "../../theme.js";

// Auf dem Kinder-Zuhause: eigener Verknüpfungscode + Freigabe von Eltern-Anfragen.
export function ChildFamilyCard() {
  const { state, respondToLink } = useStore();

  return (
    <Card>
      <H2>Eltern verbinden</H2>
      {state.pendingLinks.length > 0 ? (
        state.pendingLinks.map((l) => (
          <View key={l.parentProfileId} style={styles.req}>
            <Body>Ein Elternteil möchte dich begleiten.</Body>
            <View style={styles.btns}>
              <Button title="Freigeben" onPress={() => respondToLink(l.parentProfileId, true)} testID="link-approve" />
              <Button title="Ablehnen" variant="secondary" onPress={() => respondToLink(l.parentProfileId, false)} testID="link-decline" />
            </View>
          </View>
        ))
      ) : (
        <Muted>Keine offenen Anfragen.</Muted>
      )}
      <Muted>Dein Verknüpfungscode (gib ihn einem Elternteil):</Muted>
      <Text selectable style={styles.code} testID="link-code">
        {state.profileId}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  req: { gap: space.sm, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  btns: { flexDirection: "row", gap: space.sm },
  code: { fontSize: font.small, color: colors.text, fontFamily: "monospace" },
});
