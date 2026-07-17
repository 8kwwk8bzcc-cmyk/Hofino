import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { useStore } from "../store/store.js";
import { font, fonts, space } from "../theme.js";
import { useColors } from "../theme/ThemeProvider.js";

// Rechtsseiten liegen als statische Seiten auf GitHub Pages (apps/app/public/)
// und gelten für alle Auslieferungen (Web, LAN-Test, später native App).
const PRIVACY_URL = "https://8kwwk8bzcc-cmyk.github.io/Hofino/datenschutz/";
const IMPRINT_URL = "https://8kwwk8bzcc-cmyk.github.io/Hofino/impressum/";

function LegalLink({ title, url }: { title: string; url: string }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => {
        Linking.openURL(url).catch(() => {
          // Kein Browser verfügbar → nichts tun (kein Absturz).
        });
      }}
    >
      <Text style={{ fontSize: font.small, fontFamily: fonts.bodySemi, color: c.muted }}>
        {title}
      </Text>
    </Pressable>
  );
}

/** Footer-Zeile „Datenschutz · Impressum" — auf Auth- und Startscreens eingebunden. */
export function LegalLinks() {
  const { t } = useStore();
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: space.sm,
        paddingVertical: space.sm,
      }}
    >
      <LegalLink title={t("legal.privacy")} url={PRIVACY_URL} />
      <Text style={{ fontSize: font.small, color: c.faint }}>·</Text>
      <LegalLink title={t("legal.imprint")} url={IMPRINT_URL} />
    </View>
  );
}
