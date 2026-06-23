import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { formatEuros, ORDER_FEE_CENTS } from "@hofino/core";
import { useStore, type OrderOutcome } from "../store/store.js";
import { Button, Muted } from "./components.js";
import { colors, font, radius, space } from "../theme.js";

const REASON_KEYS: Record<string, string> = {
  insufficient_funds: "trade.errFunds",
  insufficient_holdings: "trade.errHoldings",
  invalid_quantity: "trade.errQuantity",
};

export function TradePanel({ instrumentId, mode }: { instrumentId: string; mode: "buy" | "sell" }) {
  const { prices, buy, sell, state, t } = useStore();
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
      setMsg(t(mode === "buy" ? "trade.bought" : "trade.sold", { qty }));
      setQty(1);
    } else {
      setMsg(t(REASON_KEYS[r.reason] ?? "trade.errGeneric"));
    }
  };

  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        <Muted>{t("trade.price")}</Muted>
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
        <Text style={styles.unit}>{t("trade.unit")}</Text>
      </View>

      <View style={styles.breakdown}>
        <View style={styles.row}>
          <Muted>{t("trade.gross")}</Muted>
          <Text style={styles.val}>{formatEuros(gross)}</Text>
        </View>
        <View style={styles.row}>
          <Muted>{t("trade.fee")}</Muted>
          <Text style={styles.val}>{mode === "buy" ? "+ " : "− "}{formatEuros(ORDER_FEE_CENTS)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.totalLabel}>{t(mode === "buy" ? "trade.debit" : "trade.credit")}</Text>
          <Text style={styles.total}>{formatEuros(Math.abs(total))}</Text>
        </View>
      </View>

      <Button
        testID={`${mode}-submit`}
        title={t(mode === "buy" ? "trade.buy" : "trade.sell")}
        onPress={submit}
        variant={mode === "buy" ? "primary" : "secondary"}
      />
      {msg && <Text style={styles.msg}>{msg}</Text>}
      <Muted>{t("trade.avail", { cash: formatEuros(state.portfolio.cashCents) })}</Muted>
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
