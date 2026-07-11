import { createClient } from "@supabase/supabase-js";

// Lokale Defaults (Supabase-CLI-Standard, kein Geheimnis). Für andere Umgebungen
// über EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY überschreiben.
const LOCAL_URL = "http://127.0.0.1:54321";
const LOCAL_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? LOCAL_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? LOCAL_ANON;

// Pane-Isolation fürs Test-Cockpit: jede App-Instanz (?pane=…) bekommt einen eigenen
// Auth-Speicher, damit mehrere Rollen gleichzeitig im selben Browser eingeloggt sein können.
function paneSuffix(): string {
  try {
    const p = new URLSearchParams(globalThis.location?.search ?? "").get("pane");
    return p ? `-${p}` : "";
  } catch {
    return "";
  }
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storageKey: `sb-hofino-auth${paneSuffix()}`,
    persistSession: true,
    autoRefreshToken: true,
    // Nötig für Passwort-Reset: der Recovery-Link liefert die Session im URL-Hash,
    // erst dadurch feuert PASSWORD_RECOVERY (→ Neues-Passwort-Screen).
    detectSessionInUrl: true,
  },
});
