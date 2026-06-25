import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useStore } from "../../store/store.js";
import { Body, Button, Card, H2, Muted } from "../../ui/components.js";
import { colors, font, fonts, space } from "../../theme.js";

// Auf dem Kinder-Zuhause: eigener Verknüpfungscode + Freigabe von Eltern-Anfragen.
export function ChildFamilyCard() {
  const { state, respondToLink, t } = useStore();

  return (
    <Card>
      <H2>{t("family.connectParents")}</H2>
      {state.pendingLinks.length > 0 ? (
        state.pendingLinks.map((l) => (
          <View key={l.parentProfileId} style={styles.req}>
            <Body>{t("family.parentWants")}</Body>
            <View style={styles.btns}>
              <Button title={t("family.approve")} onPress={() => respondToLink(l.parentProfileId, true)} testID="link-approve" />
              <Button title={t("family.decline")} variant="secondary" onPress={() => respondToLink(l.parentProfileId, false)} testID="link-decline" />
            </View>
          </View>
        ))
      ) : (
        <Muted>{t("family.noRequests")}</Muted>
      )}
      <Muted>{t("family.yourCode")}</Muted>
      <Text selectable style={styles.code} testID="link-code">
        {state.profileId}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  req: { gap: space.sm, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  btns: { flexDirection: "row", gap: space.sm },
  code: { fontSize: font.small, color: colors.text, fontFamily: fonts.display },
});
