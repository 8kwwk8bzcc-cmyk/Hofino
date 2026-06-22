import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { formatEuros, ORDER_FEE_CENTS } from "@hofino/core";
import { useStore, type OrderOutcome } from "../store/store.js";
import { Button, Muted } from "./components.js";
import { colors, font, radius, space } from "../theme.js";

const REASONS: Record<string, string> = {
  insufficient_funds: "Dafür reicht dein Cash nicht. Tipp: auf die Wunschliste setzen.",
  insufficient_holdings: "So viele Stücke hast du nicht im Depot.",
  invalid_quantity: "Bitte eine ganze Stückzahl größer 0 wählen.",
};

export function TradePanel({ instrumentId, mode }: { instrumentId: string; mode: "buy" | "sell" }) {
  const { prices, buy, sell, state } = useStore();
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);

  const price = prices.get(instrumentId) ?? 0;
  const gross = price * qty;
  const total = mode === "buy" ? gross + ORDER_FEE_CENTS : gross - ORDER_FEE_CENTS;

  const step = (d: number) => {
    setMsg(null);
    setQty((q) => Math.max(1, q + d));
  };

  const submit = async () => {
    setMsg(null);
    const r: OrderOutcome = mode === "buy" ? await buy(instrumentId, qty) : await sell(instrumentId, qty);
    if (r.ok) {
      setMsg(mode === "buy" ? `Gekauft: ${qty} Stück.` : `Verkauft: ${qty} Stück.`);
      setQty(1);
    } else {
      setMsg(REASONS[r.reason] ?? "Order nicht möglich.");
    }
  };

  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        <Muted>Aktueller Kurs</Muted>
        <Text style={styles.price}>{formatEuros(price)}</Text>
      </View>

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
        <Text style={styles.unit}>Stück (ganze)</Text>
      </View>

      <View style={styles.breakdown}>
        <View style={styles.row}>
          <Muted>Kurswert</Muted>
          <Text style={styles.val}>{formatEuros(gross)}</Text>
        </View>
        <View style={styles.row}>
          <Muted>Ordergebühr</Muted>
          <Text style={styles.val}>{mode === "buy" ? "+ " : "− "}{formatEuros(ORDER_FEE_CENTS)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.totalLabel}>{mode === "buy" ? "Abzug vom Cash" : "Gutschrift aufs Cash"}</Text>
          <Text style={styles.total}>{formatEuros(Math.abs(total))}</Text>
        </View>
      </View>

      <Button
        testID={`${mode}-submit`}
        title={mode === "buy" ? "Kaufen" : "Verkaufen"}
        onPress={submit}
        variant={mode === "buy" ? "primary" : "secondary"}
      />
      {msg && <Text style={styles.msg}>{msg}</Text>}
      <Muted>Verfügbares Cash: {formatEuros(state.portfolio.cashCents)}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { fontSize: font.h3, fontWeight: "800", color: colors.text },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.md },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { fontSize: 24, fontWeight: "800", color: colors.primary },
  qty: { fontSize: font.h2, fontWeight: "800", color: colors.text, minWidth: 40, textAlign: "center" },
  unit: { fontSize: font.small, color: colors.textMuted },
  breakdown: { gap: space.xs, paddingVertical: space.sm },
  val: { fontSize: font.body, color: colors.text, fontWeight: "600" },
  totalLabel: { fontSize: font.body, fontWeight: "700", color: colors.text },
  total: { fontSize: font.h3, fontWeight: "800", color: colors.text },
  msg: { fontSize: font.small, color: colors.primary, fontWeight: "600" },
});
