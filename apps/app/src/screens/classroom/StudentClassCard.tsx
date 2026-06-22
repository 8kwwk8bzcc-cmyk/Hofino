import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useStore, type MyClass } from "../../store/store.js";
import { Body, Button, Card, H2, Muted } from "../../ui/components.js";
import { colors, font, radius, space } from "../../theme.js";

// Auf dem Kinder-Zuhause: Klasse beitreten bzw. aktuelle Klasse anzeigen.
export function StudentClassCard() {
  const { joinClass, fetchMyClass } = useStore();
  const [myClass, setMyClass] = useState<MyClass | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setMyClass(await fetchMyClass());
    setLoaded(true);
  }, [fetchMyClass]);

  useEffect(() => {
    reload();
  }, [reload]);

  const submit = async () => {
    setMsg(null);
    const r = await joinClass(code);
    if (r.ok) {
      setCode("");
      await reload();
    } else {
      setMsg(r.message);
    }
  };

  if (!loaded) return null;

  return (
    <Card>
      <H2>Klasse</H2>
      {myClass ? (
        <Body>
          Du bist in <Text style={{ fontWeight: "800" }}>{myClass.name}</Text> (Code {myClass.code}).
        </Body>
      ) : (
        <>
          <Muted>Hast du einen Klassencode von deiner Lehrerin/deinem Lehrer?</Muted>
          <TextInput
            testID="class-code-input"
            value={code}
            onChangeText={setCode}
            placeholder="Klassencode (z. B. AB12CD)"
            autoCapitalize="characters"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Button title="Klasse beitreten" onPress={submit} disabled={code.trim().length < 4} testID="join-class" />
          {msg && <Text style={styles.msg}>{msg}</Text>}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
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
});
