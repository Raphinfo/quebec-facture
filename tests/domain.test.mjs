import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
const {
  default: { calculateDocument, hasProAccess },
} = await import(
  pathToFileURL(path.join(process.env.QF_TEST_BUILD, "money.js")).href
);
const {
  default: {
    emailAddress,
    passwordValue,
    clientIdValue,
    dateValue,
    safeLogo,
    escapeHtml,
  },
} = await import(
  pathToFileURL(path.join(process.env.QF_TEST_BUILD, "validation.js")).href
);
const line = (price, rest = {}) => ({
  description: "Service",
  unitPrice: price,
  quantity: 1,
  ...rest,
});
test("taxes et total restent cohérents au cent près", () => {
  const d = calculateDocument([line("1200.00")]);
  assert.equal(d.amountSubtotal, 1200);
  assert.equal(d.tpsAmount, 60);
  assert.equal(d.tvqAmount, 119.7);
  assert.equal(d.amountTotal, 1379.7);
});
test("petits montants et quantités fractionnaires sont arrondis avant les taxes", () => {
  const d = calculateDocument([
    line("0.05", { quantity: 0.5 }),
    line("0.10", { quantity: 3 }),
  ]);
  assert.equal(d.amountSubtotal, 0.33);
  assert.equal(d.amountTotal, 0.38);
});
test("taxes désactivées pour une entreprise non inscrite", () => {
  const d = calculateDocument([line("100")], { tps: false, tvq: false });
  assert.equal(d.amountTotal, 100);
});
test("exemptions indépendantes par ligne", () => {
  const d = calculateDocument([
    line("100", { isTpsApplicable: false }),
    line("100", { isTvqApplicable: false }),
  ]);
  assert.equal(d.tpsAmount, 5);
  assert.equal(d.tvqAmount, 9.98);
  assert.equal(d.amountTotal, 214.98);
});
test("un total fourni par le navigateur est ignoré", () => {
  const d = calculateDocument([
    line("10", { quantity: 2, total: 0, amount: -100 }),
  ]);
  assert.equal(d.amountSubtotal, 20);
});
test("valeurs invalides et débordements rejetés", () => {
  for (const value of [-1, Infinity, NaN, "1e6", "1.001", "12abc", {}, null])
    assert.throws(() => calculateDocument([line(value)]));
  assert.throws(() => calculateDocument([]));
  assert.throws(() => calculateDocument(Array(101).fill(line(1))));
  assert.throws(() =>
    calculateDocument([line(10000000, { quantity: 100000 })]),
  );
  assert.throws(() => calculateDocument([line(2, { description: "" })]));
});
test("seuls les abonnements actifs ou en essai ont les droits Pro", () => {
  for (const status of ["PAST_DUE", "CANCELED", "PENDING"])
    assert.equal(hasProAccess("PRO", status), false);
  assert.equal(hasProAccess("PRO", "ACTIVE"), true);
  assert.equal(hasProAccess("PRO", "TRIALING"), true);
  assert.equal(hasProAccess("FREE", "ACTIVE"), false);
});
test("normalisation et validation des comptes", () => {
  assert.equal(emailAddress(" USER@Example.com "), "user@example.com");
  assert.throws(() => emailAddress("bad"));
  assert.throws(() => passwordValue("short", true));
  assert.throws(() => passwordValue("é".repeat(37), true));
  assert.equal(
    passwordValue("une phrase assez longue", true),
    "une phrase assez longue",
  );
});
test("identifiants et dates stricts", () => {
  assert.equal(clientIdValue("12"), 12);
  for (const id of ["12abc", 0, -1, 1.1, null])
    assert.throws(() => clientIdValue(id));
  assert.equal(dateValue("2028-02-29"), "2028-02-29");
  assert.throws(() => dateValue("2026-02-30"));
});
test("les documents échappent le HTML et refusent les logos actifs ou distants", () => {
  assert.equal(
    escapeHtml('<img src=x onerror="x">'),
    "&lt;img src=x onerror=&quot;x&quot;&gt;",
  );
  for (const logo of [
    "javascript:alert(1)",
    "https://tracker.example/logo.png",
    "data:image/svg+xml;base64,PHN2Zz4=",
  ])
    assert.throws(() => safeLogo(logo));
  assert.equal(
    safeLogo("data:image/png;base64,YQ=="),
    "data:image/png;base64,YQ==",
  );
});

const {
  default: { generateDocumentPdf },
} = await import(
  pathToFileURL(path.join(process.env.QF_TEST_BUILD, "pdf.js")).href
);

test("le générateur PDF produit un document valide avec accents, Interac et caractères spéciaux", async () => {
  const bytes = await generateDocumentPdf({
    kind: "Facture",
    number: "FAC-2026-000001",
    date: "2026-11-26",
    dueDate: "2026-12-26",
    status: "PENDING",
    companyName: "Atelier Québec Inc.",
    companyAddress: "123 rue Saint-Jean\nQuébec (QC)",
    tpsNumber: "123456789RT0001",
    tvqNumber: "1234567890TQ0001",
    interacEmail: "paiements@atelierquebec.ca",
    clientName: "François Côté — 🚀",
    clientCompany: "Boulangerie L’Épi d’Or",
    clientEmail: "francois@example.test",
    items: [
      {
        description: "Développement web & intégration TPS/TVQ",
        quantity: 2,
        unitPrice: 600,
        amount: 1200,
      },
    ],
    subtotal: 1200,
    tps: 60,
    tvq: 119.7,
    total: 1379.7,
    notes: "Merci de votre confiance…",
  });
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length > 1000);
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString("ascii"), "%PDF-");
});
