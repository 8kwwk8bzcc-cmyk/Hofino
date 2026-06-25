import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { formatEuros } from "@hofino/core";
import { useStore } from "../store/store.js";
import { Body, Button, Card, H1, H2, Muted, Pill } from "../ui/components.js";
import { colors, font, fonts, radius, space } from "../theme.js";

type Action = "buy" | "sell" | "hold";
type Step = "action" | "quantity" | "reason" | "review" | "done";
const REASONS = ["long_term_growth", "reduce_risk", "not_enough_information", "diversify", "own_reason"] as const;

// Geführte Übungsentscheidung (Phase 3): Aktion → Menge/Gebühr → Begründung → Review → Abschluss.
export function DecisionFlow({
  instrumentId,
  instrumentName,
  onClose,
  onDone,
}: {
  instrumentId: string;
  instrumentName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, prices, state, submitDecision } = useStore();
  const [step, setStep] = useState<Step>("action");
  const [action, setAction] = useState<Action>("hold");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ xp: number } | null>(null);

  const priceCents = prices.get(instrumentId) ?? 0;
  const owned = state.portfolio.holdings.find((h) => h.instrumentId === instrumentId)?.quantity ?? 0;
  const cash = state.portfolio.cashCents;
  const n = Number(qty);
  const qtyValid = Number.isInteger(n) && n > 0; // keine Bruchstücke (TC-005)
  const grossCents = priceCents * (qtyValid ? n : 0);
  const feeCents = 500;
  const buyTotal = grossCents + feeCents;
  const sellNet = grossCents - feeCents;
  const qtyError =
    !qtyValid ? t("decision.errQuantity")
      : action === "buy" && buyTotal > cash ? t("decision.errInsufficientFunds")
      : action === "sell" && n > owned ? t("decision.errInsufficientHoldings")
      : null;
  const reasonOk = reason !== null && (reason !== "own_reason" || reasonText.trim().length >= 5);

  const chooseAction = (a: Action) => {
    setAction(a);
    setStep(a === "hold" ? "reason" : "quantity");
  };

  const confirm = async () => {
    setBusy(true);
    setErr(null);
    const r = await submitDecision(action, action === "hold" ? 0 : n, reason as string, reasonText.trim() || undefined);
    setBusy(false);
    if (r.ok) {
      setResult({ xp: r.xp ?? 15 });
      setStep("done");
    } else {
      setErr(
        r.reason === "insufficient_funds" ? t("decision.errInsufficientFunds")
          : r.reason === "insufficient_holdings" ? t("decision.errInsufficientHoldings")
          : r.reason === "market_not_viewed" ? t("decision.errMarket")
          : t("decision.errGeneric"),
      );
    }
  };

  const actionLabel = action === "buy" ? t("decision.buy") : action === "sell" ? t("decision.sell") : t("decision.hold");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title={t("discover.back")} variant="ghost" onPress={onClose} testID="decision-cancel" />

      {step === "action" && (
        <Card>
          <H1>{t("decision.actionTitle", { name: instrumentName })}</H1>
          <Muted>{t("global.virtualNote")}</Muted>
          <Button title={t("decision.buy")} onPress={() => chooseAction("buy")} testID="action-buy" />
          <Button title={t("decision.sell")} variant="secondary" onPress={() => chooseAction("sell")} testID="action-sell" />
          <Button title={t("decision.hold")} variant="secondary" onPress={() => chooseAction("hold")} testID="action-hold" />
        </Card>
      )}

      {step === "quantity" && (
        <Card>
          <H2>{t("decision.quantityTitle")}</H2>
          <Muted>{t("decision.price", { price: formatEuros(priceCents) })}</Muted>
          {action === "sell" && <Muted>{t("decision.owned", { n: owned })}</Muted>}
          <TextInput
            testID="qty-input"
            value={qty}
            onChangeText={setQty}
            keyboardType="number-pad"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Muted>{t("decision.feeNotice")}</Muted>
          <Text style={styles.total}>
            {action === "buy"
              ? t("decision.totalBuy", { total: formatEuros(buyTotal) })
              : t("decision.totalSell", { total: formatEuros(sellNet) })}
          </Text>
          {qtyError && <Text style={styles.err}>{qtyError}</Text>}
          <Button title={t("decision.next")} onPress={() => setStep("reason")} disabled={!!qtyError} testID="qty-next" />
        </Card>
      )}

      {step === "reason" && (
        <Card>
          <H2>{t("decision.reasonTitle")}</H2>
          {REASONS.map((r) => (
            <Pressable key={r} testID={`reason-${r}`} onPress={() => setReason(r)} style={[styles.reason, reason === r && styles.reasonActive]}>
              <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>{t(`reason.${r}`)}</Text>
            </Pressable>
          ))}
          {reason === "own_reason" && (
            <TextInput
              testID="reason-text"
              value={reasonText}
              onChangeText={setReasonText}
              placeholder={t("decision.ownPlaceholder")}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
            />
          )}
          <Button title={t("decision.next")} onPress={() => setStep("review")} disabled={!reasonOk} testID="reason-next" />
        </Card>
      )}

      {step === "review" && (
        <Card>
          <H2>{t("decision.reviewTitle")}</H2>
          <View style={styles.row}><Muted>{instrumentName}</Muted><Text style={styles.val}>{actionLabel}</Text></View>
          {action !== "hold" && (
            <>
              <View style={styles.row}><Muted>{t("decision.quantityTitle")}</Muted><Text style={styles.val}>{n}</Text></View>
              <View style={styles.row}><Muted>{t("decision.priceLabel")}</Muted><Text style={styles.val}>{formatEuros(priceCents)}</Text></View>
              <View style={styles.row}><Muted>{t("depot.feeTitle")}</Muted><Text style={styles.val}>{formatEuros(feeCents)}</Text></View>
              <View style={styles.row}>
                <Muted>{action === "buy" ? t("decision.totalBuyShort") : t("decision.totalSellShort")}</Muted>
                <Text style={styles.val}>{formatEuros(action === "buy" ? buyTotal : sellNet)}</Text>
              </View>
            </>
          )}
          <View style={styles.row}><Muted>{t("decision.reasonTitle")}</Muted></View>
          <Body>{t(`reason.${reason}`)}{reason === "own_reason" ? `: ${reasonText.trim()}` : ""}</Body>
          <Pill label={t("start.virtual")} tone="neutral" />
          {err && <Text style={styles.err}>{err}</Text>}
          <Button title={busy ? t("auth.wait") : t("decision.confirm")} onPress={confirm} disabled={busy} testID="decision-confirm" />
        </Card>
      )}

      {step === "done" && (
        <Card style={styles.doneCard}>
          <H1>{action === "hold" ? t("decision.holdSuccessTitle") : t("decision.orderSuccessTitle")}</H1>
          <Body>{action === "hold" ? t("decision.holdSuccessBody") : t("decision.orderSuccessBody")}</Body>
          <Pill label={t("decision.xpAwarded", { xp: result?.xp ?? 15 })} tone="gold" />
          <Muted>{t("decision.journalCreated")}</Muted>
          <Button title={t("learn.backToOverview")} onPress={onDone} testID="decision-done" />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.lg, backgroundColor: colors.background },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md,
    fontSize: font.body, color: colors.text, backgroundColor: colors.surface,
  },
  total: { fontSize: font.h3, fontWeight: "800", color: colors.text, fontFamily: fonts.display },
  err: { color: colors.danger, fontWeight: "600", fontSize: font.small, fontFamily: fonts.body },
  reason: { padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  reasonActive: { borderColor: colors.secondary, backgroundColor: "#F0FDF4" },
  reasonText: { fontSize: font.body, color: colors.text, fontFamily: fonts.body },
  reasonTextActive: { fontWeight: "700", color: colors.text, fontFamily: fonts.bodyBold },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  val: { fontSize: font.body, fontWeight: "700", color: colors.text, fontFamily: fonts.display },
  doneCard: { borderColor: colors.secondary, backgroundColor: "#F0FDF4" },
});
