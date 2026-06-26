import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { formatEuros, ORDER_FEE_CENTS } from "@hofino/core";
import { useStore, type OrderOutcome } from "../store/store.js";
import { Button, Muted } from "./components.js";
import { font, fonts, radius, space, type Palette } from "../theme.js";
import { useThemedStyles } from "../theme/ThemeProvider.js";

const REASON_KEYS: Record<string, string> = {
  insufficient_funds: "trade.errFunds",
  insufficient_holdings: "trade.errHoldings",
  invalid_quantity: "trade.errQuantity",
};

export function TradePanel({ instrumentId, mode }: { instrumentId: string; mode: "buy" | "sell" }) {
  const { prices, buy, sell, state, t } = useStore();
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    panel: { gap: space.md },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    price: { fontSize: font.h3, fontWeight: "800", color: c.text, fontFamily: fonts.display },
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
    msg: { fontSize: font.small, color: c.navy, fontWeight: "600", fontFamily: fonts.body },
  });
