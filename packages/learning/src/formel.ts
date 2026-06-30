// Sicherer Auswerter für Vorlagen-Formeln (z. B. "n * preis + 5", "ceil(ziel / betrag)").
// Kein eval(): eigener Recursive-Descent-Parser für + - * / , Klammern, Variablen, ganze
// Zahlen und eine feste Whitelist mathematischer Funktionen (ceil/floor/round/abs/min/max/pow).

type Tokens = string[];

/** Erlaubte Funktionen (Whitelist) mit Stelligkeit; pow/min/max nehmen 2 Argumente. */
const FUNCTIONS: Record<string, (args: number[]) => number> = {
  ceil: (a) => Math.ceil(a[0]!),
  floor: (a) => Math.floor(a[0]!),
  round: (a) => Math.round(a[0]!),
  abs: (a) => Math.abs(a[0]!),
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  pow: (a) => Math.pow(a[0]!, a[1]!),
};

function tokenize(expr: string): Tokens {
  const out: Tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i]!;
    if (ch === " ") {
      i++;
    } else if ("+-*/(),".includes(ch)) {
      out.push(ch);
      i++;
    } else if (/[0-9]/.test(ch)) {
      let num = "";
      while (i < expr.length && /[0-9]/.test(expr[i]!)) num += expr[i++];
      out.push(num);
    } else if (/[a-zA-Z_]/.test(ch)) {
      let id = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i]!)) id += expr[i++];
      out.push(id);
    } else {
      throw new Error(`Ungültiges Zeichen in Formel: '${ch}'`);
    }
  }
  return out;
}

/** Wertet einen arithmetischen Ausdruck mit gegebenen Variablen aus. */
export function evalFormel(expr: string, vars: Record<string, number>): number {
  const tokens = tokenize(expr);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  // expr := term (('+'|'-') term)*
  function parseExpr(): number {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  // term := factor (('*'|'/') factor)*
  function parseTerm(): number {
    let v = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = next();
      const r = parseFactor();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  // factor := '-' factor | '(' expr ')' | number | variable
  function parseFactor(): number {
    const t = peek();
    if (t === "-") {
      next();
      return -parseFactor();
    }
    if (t === "(") {
      next();
      const v = parseExpr();
      if (next() !== ")") throw new Error("Fehlende schließende Klammer");
      return v;
    }
    if (t === undefined) throw new Error("Unerwartetes Formelende");
    if (/^[0-9]+$/.test(t)) {
      next();
      return Number(t);
    }
    // Funktion (Identifier direkt gefolgt von '(') oder Variable.
    next();
    if (peek() === "(") {
      const fn = FUNCTIONS[t];
      if (!fn) throw new Error(`Unbekannte Funktion: '${t}'`);
      next(); // '('
      const args: number[] = [];
      if (peek() !== ")") {
        args.push(parseExpr());
        while (peek() === ",") {
          next();
          args.push(parseExpr());
        }
      }
      if (next() !== ")") throw new Error("Fehlende schließende Klammer im Funktionsaufruf");
      return fn(args);
    }
    if (!(t in vars)) throw new Error(`Unbekannte Variable: '${t}'`);
    return vars[t]!;
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error("Formel nicht vollständig ausgewertet");
  return result;
}
