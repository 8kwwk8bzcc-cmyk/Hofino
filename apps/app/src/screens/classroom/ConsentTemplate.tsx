import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStore } from "../../store/store.js";
import { Body, Button, Card, H1, H2 } from "../../ui/components.js";
import { font, fonts, space, type Palette } from "../../theme.js";
import { useThemedStyles } from "../../theme/ThemeProvider.js";

// Druckbare Einwilligungsvorlage für den Schulweg (AUTH.md Paket E).
// Die Lehrkraft druckt sie (Web: window.print) und sammelt die Unterschriften
// ein, BEVOR sie die Klasse anlegt und den Klassencode ausgibt.
// Bewusst deutschsprachig: ein rechtlicher Elternbrief wird nicht maschinell
// zweisprachig ausgespielt (ersetzt keine Rechtsberatung, siehe AUTH.md).
const PARAGRAPHS: { title: string; text: string }[] = [
  {
    title: "Was ist Hofino?",
    text:
      "Hofino ist eine Finanzbildungs-App (ab 12 Jahren) für den Unterricht. Ihr Kind übt den Umgang " +
      "mit Geld und Investieren ausschließlich mit virtuellem Übungsgeld. Es fließt zu keinem Zeitpunkt " +
      "echtes Geld, es werden keine echten Wertpapiere gehandelt, es gibt keine Kaufempfehlungen, keine " +
      "Werbung und keine Chat-Funktionen.",
  },
  {
    title: "Welche Daten werden verarbeitet?",
    text:
      "Ihr Kind nutzt die App mit einem frei gewählten Spitznamen – ohne echten Namen und ohne " +
      "E-Mail-Adresse. Gespeichert werden nur der Spitzname, der Lernfortschritt (z. B. beantwortete " +
      "Quizfragen, Wissenspunkte) und das virtuelle Übungsdepot. Die Lehrkraft sieht ausschließlich " +
      "zusammengefasste Klassenwerte und Lernstände, keine privaten Informationen. Die Daten werden auf " +
      "Servern in der EU (Irland) gespeichert und nicht an Dritte weitergegeben.",
  },
  {
    title: "Freiwilligkeit und Widerruf",
    text:
      "Die Teilnahme ist freiwillig. Sie können diese Einwilligung jederzeit ohne Angabe von Gründen " +
      "gegenüber der Lehrkraft widerrufen; das Konto Ihres Kindes wird dann samt aller Daten gelöscht. " +
      "Das Konto kann auch in der App selbst gelöscht werden.",
  },
  {
    title: "Einwilligung",
    text:
      "Hiermit willige ich ein, dass mein Kind Hofino im Rahmen des Unterrichts nutzt und die oben " +
      "beschriebenen Daten dafür verarbeitet werden (Art. 6 Abs. 1 lit. a, Art. 8 DSGVO).",
  },
];

const SIGNATURE_LINES = [
  "Name des Kindes: _______________________________  Klasse: ____________",
  "Name der/des Erziehungsberechtigten: ___________________________________",
  "Ort, Datum: _____________________  Unterschrift: _______________________",
];

export function ConsentTemplate({ onClose }: { onClose: () => void }) {
  const { t } = useStore();
  const styles = useThemedStyles(makeStyles);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <H1>Einwilligungserklärung – Hofino im Unterricht</H1>
      {PARAGRAPHS.map((p) => (
        <Card key={p.title}>
          <H2>{p.title}</H2>
          <Body>{p.text}</Body>
        </Card>
      ))}
      <Card>
        {SIGNATURE_LINES.map((line) => (
          <Text key={line} style={styles.signature}>
            {line}
          </Text>
        ))}
      </Card>
      <View style={styles.actions}>
        {Platform.OS === "web" && (
          <Button testID="consent-print" title={t("class.print")} onPress={() => globalThis.window?.print()} />
        )}
        <Button testID="consent-close" title={t("class.back")} variant="ghost" onPress={onClose} />
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { padding: space.lg, gap: space.md, backgroundColor: c.bg },
    signature: {
      fontSize: font.body,
      color: c.text,
      fontFamily: fonts.body,
      paddingVertical: space.md,
    },
    actions: { gap: space.sm },
  });
