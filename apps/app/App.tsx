import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>H</Text>
      </View>
      <Text style={styles.title}>Hofino</Text>
      <Text style={styles.claim}>Geld verstehen. Investieren üben.</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: colors.secondary, fontSize: 52, fontWeight: "800" },
  title: { color: colors.primary, fontSize: 32, fontWeight: "800" },
  claim: { color: colors.primary, fontSize: 16, opacity: 0.8 },
});
