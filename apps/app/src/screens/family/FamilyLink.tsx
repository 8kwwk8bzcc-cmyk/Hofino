import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useStore } from "../../store/store.js";
import { supabase } from "../../lib/supabase.js";
import { Body, Button, Card, H1, H2, Muted } from "../../ui/components.js";
import { colors, font, radius, space } from "../../theme.js";

interface LinkRow {
  childId: string;
  status: string;
}

export function FamilyLink() {
  const { state, linkChild, fetchFamily, t } = useStore();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());

  const reload = useCallback(async () => {
    if (!state.profileId) return;
    const res = await supabase
      .from("parent_child_links")
      .select("child_profile_id, status")
      .eq("parent_profile_id", state.profileId);
    setLinks((res.data ?? []).map((r) => ({ childId: r.child_profile_id, status: r.status })));
    const family = await fetchFamily();
    setNames(new Map(family.map((c) => [c.profileId, c.displayName])));
  }, [state.profileId, fetchFamily]);

  useEffect(() => {
    reload();
  }, [reload]);

  const submit = async () => {
    setMsg(null);
    const r = await linkChild(code);
    if (r.ok) {
      setMsg(t("family.requestSent"));
      setCode("");
      await reload();
    } else {
      setMsg(r.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <H1>{t("family.linkChild")}</H1>
      <Card>
        <H2>{t("family.enterCode")}</H2>
        <Body>{t("family.enterCodeBody")}</Body>
        <TextInput
          testID="child-code-input"
          value={code}
          onChangeText={setCode}
          placeholder={t("family.codePlaceholder")}
          autoCapitalize="none"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Button title={t("family.requestLink")} onPress={submit} disabled={code.trim().length < 8} testID="link-submit" />
        {msg && <Text style={styles.msg}>{msg}</Text>}
      </Card>

      <Card>
        <H2>{t("family.links")}</H2>
        {links.length === 0 ? (
          <Muted>{t("family.noLinks")}</Muted>
        ) : (
          links.map((l) => (
            <View key={l.childId} style={styles.row}>
              <Text style={styles.name}>{names.get(l.childId) ?? t("family.codeFallback", { tail: l.childId.slice(-6) })}</Text>
              <Text style={[styles.status, l.status === "approved" && { color: colors.secondary }]}>
                {l.status === "approved" ? t("family.statusApproved") : l.status === "declined" ? t("family.statusDeclined") : t("family.statusPending")}
              </Text>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, backgroundColor: colors.background },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: font.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  msg: { fontSize: font.small, color: colors.primary, fontWeight: "600" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { fontSize: font.body, color: colors.text, fontWeight: "600" },
  status: { fontSize: font.small, color: colors.textMuted, fontWeight: "600" },
});
