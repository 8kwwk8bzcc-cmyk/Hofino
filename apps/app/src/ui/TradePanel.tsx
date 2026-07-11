import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { formatEuros, ORDER_FEE_CENTS } from "@hofino/core";
import { useStore, type OrderOutcome } from "../store/store.js";
import { Button, Muted } from "./components.js";
import { useToast } from "./Toast.js";
import { font, fonts, radius, space, type Palette } from "../theme.js";
import { useThemedStyles } from "../theme/ThemeProvider.js";

const REASON_KEYS: Record<string, string> = {
  insufficient_funds: "trade.errFunds",
  insufficient_holdings: "trade.errHoldings",
  invalid_quantity: "trade.errQuantity",
  no_price: "trade.errNoPrice",
};

export function TradePanel({
  instrumentId,
  mode,
  onSuccess,
  fixedQuantity,
  waiveFee = false,
}: {
  instrumentId: string;
  mode: "buy" | "sell";
  onSuccess?: () => void;
  // Intro: feste Stückzahl (Stepper ausgeblendet) und gebührenfreie erste Order.
  fixedQuantity?: number;
  waiveFee?: boolean;
}) {
  const { prices, buy, sell, state, t } = useStore();
  const toast = useToast();
  const styles = useThemedStyles(makeStyles);
  const [qtyState, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const qty = fixedQuantity ?? qtyState;
  const fee = waiveFee ? 0 : ORDER_FEE_CENTS;
  const price = prices.get(instrumentId) ?? 0;
  const gross = price * qty;
  const total = mode === "buy" ? gross + fee : gross - fee;

  const step = (d: number) => {
    setQty((q) => Math.max(1, q + d));
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const r: OrderOutcome = mode === "buy" ? await buy(instrumentId, qty, waiveFee) : await sell(instrumentId, qty);
      if (r.ok) {
        toast.show(t(mode === "buy" ? "trade.bought" : "trade.sold", { qty }), "success");
        setQty(1);
        onSuccess?.();
      } else {
        toast.show(t(REASON_KEYS[r.reason] ?? "trade.errGeneric"), "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        <Muted>{t("trade.price")}</Muted>
        <Text style={styles.price}>{formatEuros(price)}</Text>
      </View>

      {fixedQuantity == null ? (
        <View style={styles.stepper}>
          <Pressable testID="qty-minus" onPress={() => step(-1)} style={styles.stepBtn}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text testID="qty-value" style={styles.qty}>
            {qty}
          </Text>
          <Pressable testID="qty-plus" onPress={() => step(1)} style={styles.stepBtn}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
          <Text style={styles.unit}>{t("trade.unit")}</Text>
        </View>
      ) : (
        <View style={styles.row}>
          <Muted>{t("trade.quantity")}</Muted>
          <Text testID="qty-value" style={styles.val}>{`${qty} ${t("trade.unit")}`}</Text>
        </View>
      )}

      <View style={styles.breakdown}>
        <View style={styles.row}>
          <Muted>{t("trade.gross")}</Muted>
          <Text style={styles.val}>{formatEuros(gross)}</Text>
        </View>
        <View style={styles.row}>
          <Muted>{t("trade.fee")}</Muted>
          {waiveFee ? (
            <Text style={styles.feeFree}>{t("trade.feeFree")}</Text>
          ) : (
            <Text style={styles.val}>{mode === "buy" ? "+ " : "− "}{formatEuros(ORDER_FEE_CENTS)}</Text>
          )}
        </View>
        <View style={styles.row}>
          {/* Verkauf unter Gebührenhöhe: Konto wird BELASTET, nicht gutgeschrieben —
              Label entsprechend umschalten statt den Betrag per Math.abs zu schönen. */}
          <Text style={styles.totalLabel}>
            {t(mode === "buy" || total < 0 ? "trade.debit" : "trade.credit")}
          </Text>
          <Text style={styles.total}>{formatEuros(Math.abs(total))}</Text>
        </View>
      </View>

      <Button
        testID={`${mode}-submit`}
        title={t(mode === "buy" ? "trade.buy" : "trade.sell")}
        onPress={submit}
        loading={submitting}
        // Ohne Kurs (0,00 €) keine Order anbieten — der Server lehnt ohnehin mit no_price ab.
        disabled={price <= 0}
        variant={mode === "buy" ? "primary" : "secondary"}
      />
      <Muted>{t("trade.avail", { cash: formatEuros(state.portfolio.cashCents) })}</Muted>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    panel: { gap: space.md },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    price: { fontSize: font.h3, fontWeight: "800", color: c.text, fontFamily: fonts.display },
    feeFree: { fontSize: font.body, color: c.success, fontWeight: "700", fontFamily: fonts.display },
    stepper: { flexDirection: "row", alignItems: "center", gap: space.md },
    stepBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stepText: { fontSize: 24, fontWeight: "800", color: c.navy, fontFamily: fonts.bodyBold },
    qty: { fontSize: font.h2, fontWeight: "800", color: c.text, minWidth: 40, textAlign: "center", fontFamily: fonts.display },
    unit: { fontSize: font.small, color: c.muted, fontFamily: fonts.body },
    breakdown: { gap: space.xs, paddingVertical: space.sm },
    val: { fontSize: font.body, color: c.text, fontWeight: "600", fontFamily: fonts.display },
    totalLabel: { fontSize: font.body, fontWeight: "700", color: c.text, fontFamily: fonts.bodyBold },
    total: { fontSize: font.h3, fontWeight: "800", color: c.text, fontFamily: fonts.display },
  });
