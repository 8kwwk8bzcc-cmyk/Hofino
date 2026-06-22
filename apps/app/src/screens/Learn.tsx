import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MODULES, type LearningModule } from "@hofino/content";
import { useStore } from "../store/store.js";
import { Body, Button, Card, H1, H2, Muted, Pill } from "../ui/components.js";
import { colors, font, radius, space } from "../theme.js";

const BLOCK_LABELS: Record<string, string> = {
  geld: "Geld & Sparen",
  unternehmen: "Unternehmen & Aktien",
  "etf-risiko": "ETFs, Risiko & Streuung",
  "depot-langfristig": "Depot, Kosten & langfristig",
};
const BLOCK_ORDER = ["geld", "unternehmen", "etf-risiko", "depot-langfristig"];

function ModuleView({ module, onClose }: { module: LearningModule; onClose: () => void }) {
  const { completeModule } = useStore();
  const [phase, setPhase] = useState<"read" | "quiz" | "done">("read");
  const [showExpert, setShowExpert] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ correct: number; total: number; perfect: boolean } | null>(null);

  const finishQuiz = () => {
    const total = module.quiz.length;
    const correct = module.quiz.reduce((n, q, i) => n + (answers[i] === q.correctIndex ? 1 : 0), 0);
    completeModule(module.id, correct, total);
    setResult({ correct, total, perfect: correct === total });
    setPhase("done");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title="‹ Zurück" onPress={onClose} variant="ghost" testID="module-back" />
      <H1>{module.title}</H1>

      {phase === "read" && (
        <>
          <Card>
            <Body>{module.child}</Body>
          </Card>
          <Card>
            <Muted>Beispiel</Muted>
            <Body>{module.example}</Body>
          </Card>
          <Pressable onPress={() => setShowExpert((s) => !s)}>
            <Muted>{showExpert ? "▾" : "▸"} Erklärung für Eltern/Lehrer</Muted>
          </Pressable>
          {showExpert && (
            <Card>
              <Body>{module.expert}</Body>
            </Card>
          )}
          <Button title="Zum Quiz" onPress={() => setPhase("quiz")} testID="to-quiz" />
        </>
      )}

      {phase === "quiz" && (
        <>
          {module.quiz.map((q, qi) => (
            <Card key={qi}>
              <Text style={styles.question}>
                {qi + 1}. {q.question}
              </Text>
              {q.options.map((opt, oi) => {
                const chosen = answers[qi] === oi;
                return (
                  <Pressable
                    key={oi}
                    testID={`q${qi}-opt${oi}`}
                    onPress={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                    style={[styles.option, chosen && styles.optionActive]}
                  >
                    <Text style={[styles.optionText, chosen && { color: colors.primary, fontWeight: "700" }]}>
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </Card>
          ))}
          <Button
            title="Antworten prüfen"
            onPress={finishQuiz}
            disabled={Object.keys(answers).length < module.quiz.length}
            testID="check-answers"
          />
        </>
      )}

      {phase === "done" && result && (
        <Card>
          <H2>{result.perfect ? "Perfekt! 🎉" : "Geschafft!"}</H2>
          <Body>
            Du hast {result.correct} von {result.total} Fragen richtig.
          </Body>
          <View style={styles.rewards}>
            <Pill label="+500 € Lernkapital" tone="good" />
            {result.perfect && <Pill label="+500 € (perfekt)" tone="good" />}
            <Pill label="+ Wissenspunkte" tone="gold" />
          </View>
          <Body>
            {result.perfect
              ? "Volle Punktzahl – du hast Bonus-Lernkapital erhalten."
              : "Du kannst das Quiz wiederholen, um es perfekt zu machen (ohne zusätzliches Kapital)."}
          </Body>
          <Button title="Fertig" onPress={onClose} testID="module-done" />
        </Card>
      )}
    </ScrollView>
  );
}

export function Learn() {
  const { state } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);

  const open = openId ? MODULES.find((m) => m.id === openId) : undefined;
  if (open) return <ModuleView module={open} onClose={() => setOpenId(null)} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <H1>Lernen</H1>
      <Muted>
        {state.completed.length}/{MODULES.length} Modulen abgeschlossen
      </Muted>

      {BLOCK_ORDER.map((block) => (
        <Card key={block}>
          <H2>{BLOCK_LABELS[block]}</H2>
          {MODULES.filter((m) => m.block === block).map((m) => {
            const done = state.completed.includes(m.id);
            const perfect = state.quiz[m.id]?.perfect;
            return (
              <Pressable
                key={m.id}
                testID={`module-${m.id}`}
                onPress={() => setOpenId(m.id)}
                style={styles.modRow}
              >
                <Text style={styles.modIcon}>{done ? (perfect ? "🏆" : "✓") : "•"}</Text>
                <Text style={styles.modTitle}>{m.title}</Text>
              </Pressable>
            );
          })}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, backgroundColor: colors.background },
  question: { fontSize: font.body, fontWeight: "700", color: colors.text, marginBottom: space.xs },
  option: {
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionActive: { borderColor: colors.secondary, backgroundColor: "#F0FDF4" },
  optionText: { fontSize: font.body, color: colors.text },
  rewards: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" },
  modRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modIcon: { fontSize: font.h3, width: 24, textAlign: "center" },
  modTitle: { fontSize: font.body, color: colors.text, flex: 1 },
});
