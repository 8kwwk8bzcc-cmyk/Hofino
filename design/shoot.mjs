// design/shoot.mjs – frische Baseline-Screenshots für den Design-Brief.
// Voraussetzung: Web-Build liegt in apps/app/dist UND wird auf :8099 serviert.
//   1) cd apps/app && CI=1 ./node_modules/.bin/expo export --platform web
//   2) python3 -m http.server 8099 --directory apps/app/dist   (oder Preview-Server)
//   3) Einmalig: pnpm dlx playwright install chromium
//   4) node design/shoot.mjs
// Lokaler Supabase muss laufen (pnpm exec supabase status) + Seed-User vorhanden
//   (node apps/app/scripts/seed-test-users.mjs), PW hofino-dev-123.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const BASE = process.env.HOFINO_URL || "http://localhost:8099/";
const OUT = fileURLToPath(new URL("./images/", import.meta.url));
const PW = "hofino-dev-123";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page, email) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.click('[data-testid="mode-login"]');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', PW);
  await page.click('[data-testid="start-button"]');
  await page.waitForSelector('[data-testid="logout"]', { timeout: 15000 });
  await sleep(600);
}

async function shot(page, name) {
  await sleep(400);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log("✓", name);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

// 1) Onboarding (ausgeloggt)
await page.goto(BASE, { waitUntil: "networkidle" });
await sleep(600);
await shot(page, "01-onboarding");

// 2-6) Kinder-Modus (mia)
await login(page, "mia@hofino.test");
await shot(page, "02-kids-home"); // Start = Daily Finance Workout
await page.click('[data-testid="tab-learn"]');
await shot(page, "03-learn");
await page.click('[data-testid="tab-depot"]');
await shot(page, "04-depot");
await page.click('[data-testid="tab-values"]');
await shot(page, "05-discover"); // Werte
await page.click('[data-testid="tab-league"]');
await shot(page, "07-league"); // Bonus: Ligen
await page.click('[data-testid="logout"]');
await sleep(500);

// 7) Classroom (lehrer)
await login(page, "lehrer@hofino.test");
await shot(page, "06-classroom");

await browser.close();
console.log("\nFertig – Bilder in design/images/");
