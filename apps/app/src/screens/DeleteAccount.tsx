import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useStore } from "../store/store.js";
import { Body, Button, Card } from "../ui/components.js";
import { font, fonts, type Palette } from "../theme.js";
import { useThemedStyles } from "../theme/ThemeProvider.js";

// Selbstlöschung des eigenen Kontos (DSGVO + App-Store-Pflicht), zweistufig
// bestätigt. Wird ans Ende der Haupt-Screens aller Rollen gehängt.
export function DeleteAccountSection() {
  const { deleteAccount, t } = useStore();
  const styles = useThemedStyles(makeStyles);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <Button
        testID="delete-account"
        title={t("account.delete")}
        variant="ghost"
        onPress={() => setConfirming(true)}
      />
    );
  }
  return (
    <Card testID="delete-account-confirm">
      <Body>{t("account.deleteWarn")}</Body>
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        testID="delete-account-yes"
        title={t("account.deleteConfirm")}
        loading={busy}
        onPress={async () => {
          setError(null);
          setBusy(true);
          const r = await deleteAccount();
          // Bei Erfolg meldet signOut den Nutzer ab — dieser Screen verschwindet.
          if (!r.ok) {
            setBusy(false);
            setError(r.message);
          }
        }}
      />
      <Button title={t("account.deleteCancel")} variant="ghost" onPress={() => setConfirming(false)} />
    </Card>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    error: { color: c.danger, fontSize: font.small, fontFamily: fonts.body },
  });
