// Erweitert die statische app.json. Setzt die Web-baseUrl NUR, wenn EXPO_BASE_URL
// gesetzt ist (GitHub-Pages-Build unter Unterpfad, z. B. "/Hofino"). Lokal/LAN
// bleibt sie leer → App läuft an der Wurzel ("/").
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments ?? {}),
    baseUrl: process.env.EXPO_BASE_URL ?? "",
  },
});
