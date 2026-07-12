import React from "react";
import { Linking } from "react-native";
import { useStore } from "../store/store.js";
import { Button } from "../ui/components.js";

// Feedback-Kanal für die Testphase: öffnet eine vorbefüllte Mail an den
// Betreiber. Bewusst simpel (kein Formular, keine neue Tabelle) — reicht,
// damit Testfamilien und die Testklasse Probleme melden können.
const FEEDBACK_EMAIL = "hofstetter@agendaro.de";

export function FeedbackButton() {
  const { state, t } = useStore();
  const subject = encodeURIComponent("Hofino-Feedback");
  const body = encodeURIComponent(
    `Hallo!\n\nMein Feedback zu Hofino:\n\n\n—\nRolle: ${state.role}\nAnzeigename: ${state.displayName}`
  );
  return (
    <Button
      testID="feedback-button"
      title={t("feedback.button")}
      variant="ghost"
      onPress={() => {
        Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`).catch(() => {
          // Kein Mail-Client eingerichtet → nichts tun (kein Absturz).
        });
      }}
    />
  );
}
