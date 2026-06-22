import type { LearningModule } from "./schema.js";

// Die 20 Grundlagen-Lernmodule (MVP). Textkarten + 3–5 MC-Fragen je Modul.
// Sprache für 10–15-Jährige; zusätzlich eine Eltern-/Lehrer-Erklärung. Audio/Video erst V2.
export const MODULES: LearningModule[] = [
  {
    id: "m01",
    order: 1,
    block: "geld",
    title: "Was ist Geld?",
    child:
      "Geld ist ein Tauschmittel: ein Werkzeug, mit dem wir Dinge kaufen, ohne direkt Waren tauschen zu müssen. Früher tauschte man z. B. Brot gegen Schuhe – das war umständlich. Geld macht den Tausch einfach, weil es alle annehmen.",
    example: "Du gibst 2 € für ein Eis. Der Verkäufer nimmt das Geld, weil er damit selbst etwas kaufen kann.",
    expert:
      "Geld erfüllt drei Funktionen: Tauschmittel, Recheneinheit und Wertaufbewahrung. Sein Wert beruht auf dem Vertrauen, dass andere es ebenfalls annehmen.",
    quiz: [
      {
        question: "Wofür benutzt man Geld vor allem?",
        options: ["Nur zum Sammeln", "Als Tauschmittel zum Kaufen", "Um es wegzuwerfen"],
        correctIndex: 1,
      },
      {
        question: "Was war am direkten Warentausch (Brot gegen Schuhe) umständlich?",
        options: [
          "Man musste jemanden finden, der genau das Passende wollte",
          "Brot war zu teuer",
          "Es war zu leise",
        ],
        correctIndex: 0,
      },
      {
        question: "Worauf beruht der Wert von Geld?",
        options: ["Auf seinem Gewicht", "Auf seiner Farbe", "Auf dem Vertrauen, dass andere es annehmen"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "m02",
    order: 2,
    block: "geld",
    title: "Sparen vs. Ausgeben",
    child:
      "Ausgeben heißt, Geld jetzt zu nutzen. Sparen heißt, Geld zurückzulegen, um später ein größeres oder wichtigeres Ziel zu erreichen. Wer alles sofort ausgibt, hat für später nichts.",
    example: "Bekommst du 10 € Taschengeld und legst 4 € zur Seite, hast du nach drei Monaten 12 € für etwas Größeres.",
    expert:
      "Sparen bedeutet Konsumverzicht heute zugunsten von morgen. Es schafft einen Puffer für Unerwartetes und ermöglicht größere Anschaffungen oder Investitionen.",
    quiz: [
      {
        question: "Was bedeutet sparen?",
        options: ["Alles sofort ausgeben", "Geld für später zurücklegen", "Geld verleihen und vergessen"],
        correctIndex: 1,
      },
      {
        question: "Warum kann Sparen sinnvoll sein?",
        options: ["Weil Ausgeben verboten ist", "Damit Geld verschwindet", "Um später größere Ziele zu erreichen"],
        correctIndex: 2,
      },
      {
        question: "Du sparst 4 € im Monat. Reicht das nach 3 Monaten für etwas, das 12 € kostet?",
        options: ["Ja, genau 12 €", "Nein, nur 6 €", "Nein, erst 20 €"],
        correctIndex: 0,
      },
    ],
  },
  {
    id: "m03",
    order: 3,
    block: "geld",
    title: "Was ist Inflation?",
    child:
      "Inflation bedeutet, dass Dinge mit der Zeit teurer werden. Für dasselbe Geld bekommst du dann weniger. Kostet ein Brötchen letztes Jahr 50 Cent und jetzt 55 Cent, ist das Inflation.",
    example: "Mit 1 € bekamst du bei 50 Cent zwei Brötchen. Steigt der Preis auf 55 Cent, reicht 1 € nicht mehr für zwei.",
    expert:
      "Inflation ist der allgemeine Anstieg des Preisniveaus; die Kaufkraft des Geldes sinkt. Gemessen wird sie meist als jährliche Veränderung eines Warenkorbs (Verbraucherpreisindex).",
    quiz: [
      {
        question: "Was passiert bei Inflation?",
        options: ["Preise fallen immer", "Preise steigen, Geld ist weniger wert", "Geld wird mehr wert"],
        correctIndex: 1,
      },
      {
        question: "Was bedeutet Inflation für deine Kaufkraft?",
        options: ["Du bekommst für gleiches Geld weniger", "Du bekommst mehr", "Nichts ändert sich"],
        correctIndex: 0,
      },
      {
        question: "Ein Brötchen steigt von 50 auf 55 Cent. Das ist …",
        options: ["Ein Rabatt", "Ein Tauschgeschäft", "Inflation"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "m04",
    order: 4,
    block: "geld",
    title: "Sparbuch, Girokonto und Tagesgeld",
    child:
      "Auf dem Girokonto läuft dein täglicher Zahlungsverkehr (Geld bekommen und ausgeben). Sparbuch und Tagesgeldkonto sind zum Zurücklegen gedacht und geben oft kleine Zinsen. Tagesgeld ist meist flexibler als ein Sparbuch.",
    example: "Dein Taschengeld kommt aufs Girokonto. Was du sparst, legst du aufs Tagesgeldkonto und bekommst etwas Zinsen.",
    expert:
      "Girokonto = Zahlungsverkehr, kaum Zinsen. Tagesgeld = täglich verfügbar, variabler Zins. Sparbuch = klassische Spareinlage, oft niedrig verzinst. Alle drei sind sicher, aber kaum renditestark.",
    quiz: [
      {
        question: "Wofür ist ein Girokonto vor allem da?",
        options: ["Hohe Zinsen", "Täglicher Zahlungsverkehr", "Aktien kaufen"],
        correctIndex: 1,
      },
      {
        question: "Was ist typisch für Tagesgeld?",
        options: ["Man kommt nie ans Geld", "Geld ist flexibel verfügbar und wird verzinst", "Es kostet immer Gebühren"],
        correctIndex: 1,
      },
      {
        question: "Welche dieser Konten bringen in der Regel kaum hohe Renditen?",
        options: ["Nur das Girokonto", "Keines", "Alle drei (Giro, Tagesgeld, Sparbuch)"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "m05",
    order: 5,
    block: "unternehmen",
    title: "Was ist eine Aktie?",
    child:
      "Eine Aktie ist ein kleiner Anteil an einem Unternehmen. Wer eine Aktie besitzt, dem gehört ein winziges Stück der Firma. Wird die Firma mehr wert, kann auch die Aktie mehr wert werden.",
    example: "Stell dir vor, eine Pizzeria wird in 100 Stücke geteilt. Kaufst du 1 Stück, gehört dir 1/100 der Pizzeria.",
    expert:
      "Eine Aktie verbrieft einen Anteil am Eigenkapital einer Aktiengesellschaft. Aktionäre tragen Chancen (Kurssteigerung, Dividende) und Risiken (Kursverlust) anteilig mit.",
    quiz: [
      {
        question: "Was ist eine Aktie?",
        options: ["Ein Kredit an eine Bank", "Ein Anteil an einem Unternehmen", "Ein Gutschein für Essen"],
        correctIndex: 1,
      },
      {
        question: "Was kann passieren, wenn die Firma mehr wert wird?",
        options: ["Die Aktie verschwindet", "Nichts ist möglich", "Die Aktie kann auch mehr wert werden"],
        correctIndex: 2,
      },
      {
        question: "Du kaufst 1 von 100 Anteilen. Wie viel der Firma gehört dir?",
        options: ["1/100", "Die ganze Firma", "Die Hälfte"],
        correctIndex: 0,
      },
    ],
  },
  {
    id: "m06",
    order: 6,
    block: "unternehmen",
    title: "Was ist ein Unternehmen?",
    child:
      "Ein Unternehmen ist eine Organisation, die Produkte herstellt oder Dienstleistungen anbietet, um Geld zu verdienen. Es beschäftigt Menschen und verkauft etwas an Kunden.",
    example: "Eine Bäckerei ist ein Unternehmen: Sie backt Brot (Produkt) und verkauft es an Kunden.",
    expert:
      "Unternehmen kombinieren Ressourcen (Arbeit, Kapital, Material), um Güter oder Dienstleistungen anzubieten. Ihr Ziel ist meist, dauerhaft Gewinn zu erwirtschaften.",
    quiz: [
      {
        question: "Was macht ein Unternehmen?",
        options: ["Nur Geld drucken", "Produkte/Dienstleistungen anbieten, um Geld zu verdienen", "Steuern verschenken"],
        correctIndex: 1,
      },
      {
        question: "Ist eine Bäckerei ein Unternehmen?",
        options: ["Ja", "Nein", "Nur sonntags"],
        correctIndex: 0,
      },
      {
        question: "Was braucht ein Unternehmen meist?",
        options: ["Nur Glück", "Nichts", "Mitarbeitende und Kunden"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "m07",
    order: 7,
    block: "unternehmen",
    title: "Wie verdient ein Unternehmen Geld?",
    child:
      "Ein Unternehmen verdient Geld, indem es etwas verkauft, das mehr einbringt, als die Herstellung kostet. Die Differenz ist der Gewinn.",
    example: "Kostet eine Pizza 3 € in der Herstellung und wird für 8 € verkauft, bleiben 5 € (vor weiteren Kosten).",
    expert:
      "Erträge entstehen aus dem Umsatz; davon werden Kosten (Material, Löhne, Miete, Steuern) abgezogen. Bleibt am Ende etwas übrig, ist es Gewinn.",
    quiz: [
      {
        question: "Wie entsteht Gewinn grob?",
        options: ["Kosten minus Einnahmen", "Einnahmen minus Kosten", "Nur durch Werbung"],
        correctIndex: 1,
      },
      {
        question: "Pizza: 3 € Kosten, 8 € Verkaufspreis. Rohgewinn?",
        options: ["5 €", "11 €", "3 €"],
        correctIndex: 0,
      },
      {
        question: "Was zählt zu den Kosten?",
        options: ["Nur die Farbe des Logos", "Material und Löhne", "Gar nichts"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "m08",
    order: 8,
    block: "unternehmen",
    title: "Was ist Umsatz?",
    child: "Umsatz ist die gesamte Summe, die ein Unternehmen durch Verkäufe einnimmt – bevor Kosten abgezogen werden.",
    example: "Verkauft ein Kiosk an einem Tag 100 Getränke für je 2 €, ist der Umsatz 200 €.",
    expert: "Umsatz (Erlös) = verkaufte Menge × Preis, vor Abzug jeglicher Kosten. Er sagt allein nichts über den Gewinn aus.",
    quiz: [
      {
        question: "Was ist Umsatz?",
        options: ["Der Gewinn nach Steuern", "Das Trinkgeld", "Alle Einnahmen aus Verkäufen vor Kosten"],
        correctIndex: 2,
      },
      {
        question: "100 Getränke × 2 €. Umsatz?",
        options: ["200 €", "2 €", "100 €"],
        correctIndex: 0,
      },
      {
        question: "Bedeutet hoher Umsatz automatisch hohen Gewinn?",
        options: ["Ja, immer", "Nein, die Kosten zählen auch", "Nur im Winter"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "m09",
    order: 9,
    block: "unternehmen",
    title: "Was ist Gewinn?",
    child:
      "Gewinn ist das, was übrig bleibt, wenn man von den Einnahmen alle Kosten abzieht. Bleibt mehr übrig als ausgegeben, gibt es Gewinn; sonst Verlust.",
    example: "Umsatz 200 €, Kosten 150 € → Gewinn 50 €.",
    expert:
      "Gewinn = Umsatz − Kosten. Er kann einbehalten (reinvestiert) oder teils als Dividende ausgeschüttet werden. Ein negativer Gewinn ist ein Verlust.",
    quiz: [
      {
        question: "Wie berechnet man Gewinn?",
        options: ["Umsatz plus Kosten", "Umsatz minus Kosten", "Nur Umsatz"],
        correctIndex: 1,
      },
      {
        question: "Umsatz 200 €, Kosten 150 €. Gewinn?",
        options: ["350 €", "150 €", "50 €"],
        correctIndex: 2,
      },
      {
        question: "Was ist es, wenn die Kosten höher als der Umsatz sind?",
        options: ["Ein Verlust", "Trotzdem Gewinn", "Eine Dividende"],
        correctIndex: 0,
      },
    ],
  },
  {
    id: "m10",
    order: 10,
    block: "unternehmen",
    title: "Warum schwanken Aktienkurse?",
    child:
      "Aktienkurse ändern sich, weil sich Angebot und Nachfrage ändern. Erwarten viele, dass eine Firma erfolgreicher wird, wollen mehr die Aktie kaufen – der Kurs steigt. Bei schlechten Nachrichten kann er fallen.",
    example: "Bringt eine Firma ein beliebtes neues Produkt heraus, wollen viele die Aktie – der Kurs steigt oft.",
    expert:
      "Kurse bilden sich aus Angebot und Nachfrage und spiegeln Erwartungen über künftige Gewinne, Zinsen, Nachrichten und Stimmungen wider. Kurzfristig sind sie schwer vorhersehbar.",
    quiz: [
      {
        question: "Warum steigt ein Kurs oft?",
        options: ["Die Firma verbietet das", "Mehr Leute wollen kaufen als verkaufen", "Zufällige Farbe"],
        correctIndex: 1,
      },
      {
        question: "Was kann Kurse beeinflussen?",
        options: ["Nur das Wetter am Meer", "Erwartungen und Nachrichten", "Gar nichts"],
        correctIndex: 1,
      },
      {
        question: "Sind kurzfristige Kurse leicht vorhersehbar?",
        options: ["Ja, immer genau", "Nur dienstags", "Nein, eher schwer"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "m11",
    order: 11,
    block: "etf-risiko",
    title: "Was ist ein ETF?",
    child:
      "Ein ETF ist ein Korb aus vielen Aktien (oder anderen Werten), den du in einem Stück kaufen kannst. Statt einzelne Firmen auszuwählen, besitzt du mit einem ETF Anteile an vielen gleichzeitig.",
    example: "Ein Welt-ETF enthält Anteile an hunderten Firmen aus vielen Ländern – mit einem Kauf bist du breit dabei.",
    expert:
      "Ein ETF (Exchange Traded Fund) bildet meist einen Index nach (z. B. MSCI World) und wird wie eine Aktie an der Börse gehandelt. Er bietet breite Streuung zu geringen Kosten.",
    quiz: [
      {
        question: "Was ist ein ETF?",
        options: ["Eine einzelne Firma", "Ein Korb aus vielen Werten in einem Produkt", "Ein Sparbuch"],
        correctIndex: 1,
      },
      {
        question: "Was ist ein Vorteil eines Welt-ETFs?",
        options: ["Garantierter Gewinn", "Keine Risiken", "Breite Streuung über viele Firmen"],
        correctIndex: 2,
      },
      {
        question: "Wie wird ein ETF gehandelt?",
        options: ["Wie eine Aktie an der Börse", "Nur per Brief", "Gar nicht"],
        correctIndex: 0,
      },
    ],
  },
  {
    id: "m12",
    order: 12,
    block: "etf-risiko",
    title: "Aktie vs. ETF",
    child:
      "Eine Aktie ist ein Anteil an einer einzigen Firma. Ein ETF bündelt viele Firmen. Mit einer Einzelaktie setzt du stärker auf eine Firma; mit einem ETF verteilst du das Risiko.",
    example:
      "Geht es einer einzelnen Firma schlecht, trifft dich das bei einer Einzelaktie stark; in einem ETF mit 500 Firmen fällt eine einzelne kaum ins Gewicht.",
    expert:
      "Einzelaktien bieten höhere Chancen und höheres Einzelrisiko (Klumpenrisiko). ETFs streuen über viele Titel und senken das unsystematische Risiko, folgen aber dem Gesamtmarkt.",
    quiz: [
      {
        question: "Worin unterscheiden sich Aktie und ETF?",
        options: ["Beide sind identisch", "Aktie = eine Firma, ETF = viele", "ETF ist eine einzelne Firma"],
        correctIndex: 1,
      },
      {
        question: "Was senkt ein ETF gegenüber einer Einzelaktie?",
        options: ["Das Einzelrisiko durch Streuung", "Die Anzahl der Firmen", "Den Vertrauensbedarf"],
        correctIndex: 0,
      },
      {
        question: "Eine von 500 Firmen im ETF fällt stark. Wirkung auf den ETF?",
        options: ["Sehr stark", "Der ETF verschwindet", "Eher gering"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "m13",
    order: 13,
    block: "etf-risiko",
    title: "Was bedeutet Risiko?",
    child:
      "Risiko bedeutet, dass das Ergebnis unsicher ist – es kann besser oder schlechter kommen als erwartet. Beim Investieren heißt das: Kurse können steigen, aber auch fallen.",
    example: "Legst du Geld in eine Aktie an, kann sie in einem Jahr mehr wert sein – oder weniger. Beides ist möglich.",
    expert:
      "Risiko ist die Schwankungsbreite möglicher Ergebnisse (Volatilität) und die Möglichkeit von Verlusten. Höhere Renditechancen gehen meist mit höherem Risiko einher.",
    quiz: [
      {
        question: "Was bedeutet Risiko beim Investieren?",
        options: ["Gewinn ist garantiert", "Das Ergebnis ist unsicher, Verluste sind möglich", "Es passiert nie etwas"],
        correctIndex: 1,
      },
      {
        question: "Wie hängen Chance und Risiko oft zusammen?",
        options: ["Mehr Chance, nie Risiko", "Sie haben nichts miteinander zu tun", "Mehr Chance meist mehr Risiko"],
        correctIndex: 2,
      },
      {
        question: "Können Kurse auch fallen?",
        options: ["Ja", "Nein, nie", "Nur an Feiertagen"],
        correctIndex: 0,
      },
    ],
  },
  {
    id: "m14",
    order: 14,
    block: "etf-risiko",
    title: "Was ist Diversifikation?",
    child:
      "Diversifikation heißt, nicht alles auf eine Karte zu setzen. Verteilst du dein Geld auf viele verschiedene Firmen und Branchen, trifft dich ein einzelner Fehlschlag weniger hart.",
    example: "Denk an den Spruch: nicht alle Eier in einen Korb. Fällt ein Korb, sind nicht alle Eier kaputt.",
    expert:
      "Diversifikation verteilt Kapital über viele Titel, Branchen und Regionen und reduziert das unsystematische Risiko. Das Marktrisiko bleibt bestehen.",
    quiz: [
      {
        question: "Was bedeutet Diversifikation?",
        options: ["Alles in eine Firma stecken", "Geld breit verteilen", "Gar nicht investieren"],
        correctIndex: 1,
      },
      {
        question: "Welcher Spruch passt?",
        options: ["Nicht alle Eier in einen Korb", "Doppelt hält besser beim Eis", "Früher Vogel verliert"],
        correctIndex: 0,
      },
      {
        question: "Was verringert Diversifikation?",
        options: ["Die Anzahl der Branchen", "Den Spaß am Lernen", "Das Risiko durch einzelne Firmen"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "m15",
    order: 15,
    block: "depot-langfristig",
    title: "Was ist ein Depot?",
    child:
      "Ein Depot ist wie ein Aufbewahrungsort für deine Wertpapiere (Aktien, ETFs). So wie ein Konto Geld verwaltet, verwaltet ein Depot deine Anteile.",
    example: "Kaufst du eine Aktie, wird sie in deinem Depot abgelegt, und du siehst dort alle deine Anteile.",
    expert:
      "Ein Wertpapierdepot verwahrt und verwaltet Wertpapiere. Käufe, Verkäufe und Bestände werden dort dokumentiert; das zugehörige Verrechnungskonto hält das Cash.",
    quiz: [
      {
        question: "Was ist ein Depot?",
        options: ["Ein Bargeldautomat", "Ein Aufbewahrungsort für Wertpapiere", "Ein Sparschwein für Münzen"],
        correctIndex: 1,
      },
      {
        question: "Was siehst du in deinem Depot?",
        options: ["Deine Aktien und ETFs", "Nur Fotos", "Dein Taschengeld in bar"],
        correctIndex: 0,
      },
      {
        question: "Wo liegt das Geld zum Kaufen?",
        options: ["Unter dem Kopfkissen", "Im ETF selbst", "Auf dem Verrechnungskonto"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "m16",
    order: 16,
    block: "depot-langfristig",
    title: "Was kostet Kaufen und Verkaufen?",
    child:
      "Beim Kaufen und Verkaufen fallen oft Gebühren an. In Hofino kostet jede Order 5 € – egal wie viele Stücke. Häufiges Hin und Her kostet also extra.",
    example: "Kaufst du 4 Aktien zu je 120 €, zahlst du 480 € plus 5 € Gebühr = 485 €.",
    expert:
      "Ordergebühren mindern die Rendite. Bei Hofino gilt 5 € pro Order (nicht pro Stück), vollständig in Gewinn/Verlust eingerechnet. Viele kleine Trades summieren die Kosten.",
    quiz: [
      {
        question: "Wie viel kostet eine Order bei Hofino?",
        options: ["5 € pro Aktie", "Gar nichts", "5 € pro Order"],
        correctIndex: 2,
      },
      {
        question: "4 Aktien à 120 € plus Gebühr. Gesamtabzug?",
        options: ["485 €", "480 €", "600 €"],
        correctIndex: 0,
      },
      {
        question: "Was bewirkt häufiges Kaufen und Verkaufen?",
        options: ["Weniger Gebühren", "Mehr Gebühren", "Keine Wirkung"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "m17",
    order: 17,
    block: "depot-langfristig",
    title: "Was ist eine Dividende?",
    child:
      "Eine Dividende ist ein Teil des Gewinns, den manche Unternehmen an ihre Aktionäre ausschütten. Du bekommst dann für jede Aktie einen kleinen Betrag.",
    example: "Zahlt eine Firma 1 € Dividende je Aktie und du hast 10 Aktien, erhältst du 10 €.",
    expert:
      "Dividenden sind Gewinnausschüttungen an Aktionäre, meist jährlich. Nicht alle Firmen zahlen sie; manche reinvestieren Gewinne lieber ins Wachstum.",
    quiz: [
      {
        question: "Was ist eine Dividende?",
        options: ["Eine Strafe", "Ein ausgeschütteter Teil des Gewinns", "Eine Gebühr"],
        correctIndex: 1,
      },
      {
        question: "1 € Dividende je Aktie, du hast 10 Aktien. Wie viel?",
        options: ["1 €", "100 €", "10 €"],
        correctIndex: 2,
      },
      {
        question: "Zahlen alle Firmen Dividende?",
        options: ["Nein, manche reinvestieren", "Ja, alle", "Nur Banken"],
        correctIndex: 0,
      },
    ],
  },
  {
    id: "m18",
    order: 18,
    block: "depot-langfristig",
    title: "Was ist langfristiges Investieren?",
    child:
      "Langfristig investieren heißt, Geld über viele Jahre angelegt zu lassen, statt ständig zu kaufen und zu verkaufen. Über lange Zeit werden kleine Schwankungen oft weniger wichtig.",
    example:
      "Wer breit gestreut viele Jahre dabei bleibt, übersteht einzelne schlechte Phasen oft besser als jemand, der bei jeder Schwankung verkauft.",
    expert:
      "Langfristiges Investieren nutzt Zeit und Zinseszinseffekt und reduziert die Bedeutung kurzfristiger Volatilität. Es steht im Gegensatz zu kurzfristigem Trading.",
    quiz: [
      {
        question: "Was kennzeichnet langfristiges Investieren?",
        options: ["Jeden Tag traden", "Lange dabeibleiben statt ständig handeln", "Sofort wieder verkaufen"],
        correctIndex: 1,
      },
      {
        question: "Was kann über lange Zeit helfen?",
        options: ["Hektik", "Glück allein", "Zinseszins und Geduld"],
        correctIndex: 2,
      },
      {
        question: "Was ist das Gegenteil von langfristigem Investieren?",
        options: ["Kurzfristiges Trading", "Sparen", "Diversifikation"],
        correctIndex: 0,
      },
    ],
  },
  {
    id: "m19",
    order: 19,
    block: "depot-langfristig",
    title: "Was ist ein Sparplan?",
    child:
      "Ein Sparplan legt automatisch in regelmäßigen Abständen (z. B. jeden Monat) einen festen Betrag an – etwa in einen ETF. So baust du Schritt für Schritt Vermögen auf, ohne jedes Mal selbst zu handeln.",
    example:
      "Du legst jeden Monat 25 € in einen Welt-ETF. Mal kaufst du bei höheren, mal bei niedrigeren Kursen – das gleicht sich über die Zeit aus.",
    expert:
      "Ein Sparplan investiert feste Beträge in festen Intervallen (Cost-Average-Effekt). Er fördert Disziplin und glättet den durchschnittlichen Einstandskurs.",
    quiz: [
      {
        question: "Was ist ein Sparplan?",
        options: ["Einmalig alles auf einmal", "Ein Kredit", "Regelmäßig fester Betrag, automatisch angelegt"],
        correctIndex: 2,
      },
      {
        question: "Welcher Effekt entsteht durch regelmäßiges Kaufen?",
        options: ["Durchschnittskosten-Effekt", "Garantierter Gewinn", "Gebührenfreiheit"],
        correctIndex: 0,
      },
      {
        question: "Was fördert ein Sparplan?",
        options: ["Hektisches Handeln", "Disziplin beim Sparen", "Zufall"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "m20",
    order: 20,
    block: "depot-langfristig",
    title: "Investieren vs. Zocken",
    child:
      "Investieren heißt, mit Plan und Wissen langfristig anzulegen und Risiken zu streuen. Zocken heißt, auf schnelle Gewinne zu hoffen, oft ohne Plan und mit hohem Risiko. Hofino übt das Investieren.",
    example:
      "Wer alles auf eine einzige besonders gehypte Aktie setzt, um schnell reich zu werden, zockt. Wer breit gestreut langfristig anlegt, investiert.",
    expert:
      "Investieren beruht auf Analyse, Streuung und Zeithorizont; Spekulation/Zocken setzt auf kurzfristige Kursbewegungen mit hohem Risiko. Hofino vermittelt bewusst die Investitionshaltung.",
    quiz: [
      {
        question: "Was beschreibt Investieren?",
        options: ["Schnell alles auf eine Karte", "Mit Plan, gestreut und langfristig anlegen", "Würfeln"],
        correctIndex: 1,
      },
      {
        question: "Was ist typisch fürs Zocken?",
        options: ["Breite Streuung", "Hohes Risiko, Hoffnung auf schnellen Gewinn", "Langer Atem"],
        correctIndex: 1,
      },
      {
        question: "Was übt Hofino?",
        options: ["Das Zocken", "Das Schuldenmachen", "Das Investieren"],
        correctIndex: 2,
      },
    ],
  },
];
