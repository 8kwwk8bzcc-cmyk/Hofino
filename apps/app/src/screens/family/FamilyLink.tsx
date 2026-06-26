import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useStore } from "../../store/store.js";
import { supabase } from "../../lib/supabase.js";
import { Body, Button, Card, H1, H2, Muted } from "../../ui/components.js";
import { font, fonts, radius, space, type Palette } from "../../theme.js";
import { useColors, useThemedStyles } from "../../theme/ThemeProvider.js";

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

  const c = useColors();
  const styles = useThemedStyles(makeStyles);

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
          placeholderTextColor={c.muted}
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
              <Text style={[styles.status, l.status === "approved" && { color: c.green }]}>
                {l.status === "approved" ? t("family.statusApproved") : l.status === "declined" ? t("family.statusDeclined") : t("family.statusPending")}
              </Text>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { padding: space.lg, gap: space.md, backgroundColor: c.bg },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: space.md,
      fontSize: font.body,
      fontFamily: fonts.body,
      color: c.text,
      backgroundColor: c.surface,
    },
    msg: { fontSize: font.small, color: c.navy, fontWeight: "600", fontFamily: fonts.body },
    row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.border },
    name: { fontSize: font.body, color: c.text, fontWeight: "600", fontFamily: fonts.body },
    status: { fontSize: font.small, color: c.muted, fontWeight: "600", fontFamily: fonts.body },
  });
