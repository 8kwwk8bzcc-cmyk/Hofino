// Leichtgewichtiges Toast-System: kurze, selbst-verschwindende Rückmeldung (z. B. nach
// Kauf/Verkauf), damit Aktionen sichtbar quittiert werden statt „wie wenn nichts passiert".
// Nutzung: const toast = useToast(); toast.show("Gekauft", "success").
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { fonts, font, radius, shadow, space, type Palette } from "../theme.js";
import { useThemedStyles } from "../theme/ThemeProvider.js";

export type ToastTone = "success" | "error" | "info";

interface ToastState {
  message: string;
  tone: ToastTone;
  /** Monoton steigend, damit gleiche Nachricht erneut animiert. */
  seq: number;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const VISIBLE_MS = 2600;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const seqRef = useRef(0);

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    seqRef.current += 1;
    setToast({ message, tone, seq: seqRef.current });
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <ToastView
          key={toast.seq}
          message={toast.message}
          tone={toast.tone}
          onHide={() => setToast((t) => (t?.seq === toast.seq ? null : t))}
        />
      )}
    </ToastContext.Provider>
  );
}

function ToastView({ message, tone, onHide }: { message: string; tone: ToastTone; onHide: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 12, duration: 220, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) onHide();
      });
    }, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View
        style={[
          styles.toast,
          tone === "success" && styles.success,
          tone === "error" && styles.error,
          { opacity, transform: [{ translateY }] },
        ]}
      >
        <Text
          testID="toast"
          style={[
            styles.text,
            tone === "success" && styles.textSuccess,
            tone === "error" && styles.textError,
          ]}
        >
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast muss innerhalb von ToastProvider verwendet werden");
  return ctx;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 96, // über der Tab-Leiste
      alignItems: "center",
      paddingHorizontal: space.lg,
    },
    toast: {
      maxWidth: 480,
      paddingVertical: space.md,
      paddingHorizontal: space.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      ...shadow.lg,
    },
    success: { backgroundColor: c.mint, borderColor: c.success },
    error: { backgroundColor: c.surface, borderColor: c.danger },
    text: { fontSize: font.body, color: c.text, fontFamily: fonts.bodySemi, textAlign: "center" },
    textSuccess: { color: c.success },
    textError: { color: c.danger },
  });
