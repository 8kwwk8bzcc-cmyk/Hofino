// i18n-Grundlage (de/en) für die UI-Hülle. Nutzer-sichtbare Chrome-Texte laufen über t().
// Redaktionelle Lerninhalte (Module/Profile) bleiben im MVP Deutsch (englische Inhalte später).
export type Lang = "de" | "en";
export const LANGS: Lang[] = ["de", "en"];

type Dict = Record<string, string>;

const de: Dict = {
  claim: "Geld verstehen. Investieren üben.",
  "auth.welcome": "Willkommen bei Hofino",
  "auth.new": "Neu hier",
  "auth.login": "Anmelden",
  "auth.roleQuestion": "Für wen ist das Konto?",
  "auth.name": "Wie möchtest du heißen?",
  "auth.namePlaceholder": "Anzeigename (kein echter Name nötig)",
  "auth.plot": "Wähle dein Grundstück",
  "auth.email": "E-Mail",
  "auth.password": "Passwort (mind. 6 Zeichen)",
  "auth.start": "Los geht's",
  "auth.signin": "Anmelden",
  "auth.wait": "Bitte warten…",
  "role.child": "Kind (10–15)",
  "role.adult": "Erwachsene",
  "role.parent": "Eltern",
  "role.teacher": "Lehrer",
  "common.logout": "Abmelden",
  "tab.home": "Zuhause",
  "tab.overview": "Übersicht",
  "tab.learn": "Lernen",
  "tab.uebung": "Üben",
  "tab.depot": "Depot",
  "tab.discover": "Entdecken",
  "tab.rankings": "Ligen",
  "tab.family": "Familie",
  "tab.link": "Verknüpfen",
  "tab.class": "Klasse",
  "tab.beamer": "Beamer",
  "brand.adult": "Hofino · Erwachsene",
  "brand.parent": "Hofino · Eltern",
  "brand.teacher": "Hofino · Lehrer",
};

const en: Dict = {
  claim: "Understand money. Practice investing.",
  "auth.welcome": "Welcome to Hofino",
  "auth.new": "New here",
  "auth.login": "Sign in",
  "auth.roleQuestion": "Who is this account for?",
  "auth.name": "What should we call you?",
  "auth.namePlaceholder": "Display name (no real name needed)",
  "auth.plot": "Choose your plot",
  "auth.email": "Email",
  "auth.password": "Password (min. 6 characters)",
  "auth.start": "Let's go",
  "auth.signin": "Sign in",
  "auth.wait": "Please wait…",
  "role.child": "Child (10–15)",
  "role.adult": "Adults",
  "role.parent": "Parents",
  "role.teacher": "Teacher",
  "common.logout": "Sign out",
  "tab.home": "Home",
  "tab.overview": "Overview",
  "tab.learn": "Learn",
  "tab.uebung": "Practice",
  "tab.depot": "Portfolio",
  "tab.discover": "Discover",
  "tab.rankings": "Leagues",
  "tab.family": "Family",
  "tab.link": "Link",
  "tab.class": "Class",
  "tab.beamer": "Projector",
  "brand.adult": "Hofino · Adults",
  "brand.parent": "Hofino · Parents",
  "brand.teacher": "Hofino · Teacher",
};

const DICTS: Record<Lang, Dict> = { de, en };

export function translate(lang: Lang, key: string): string {
  return DICTS[lang][key] ?? DICTS.de[key] ?? key;
}
