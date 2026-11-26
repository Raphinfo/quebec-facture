import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(file, mocks) {
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)(
    name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), mod, mod.exports,
  );
  return mod.exports;
}
const validation = load("lib/validation.ts", {});
const http = load("lib/http.ts", { "./validation": validation });
function route(requireUser, sql, rateLimit = async () => {}) {
  return load("app/api/export/route.ts", {
    "@/lib/session": { requireUser }, "@/lib/db": { getDb: () => sql },
    "@/lib/http": http, "@/lib/rate-limit": { rateLimit },
  });
}
test("export : profil fourni complet, sans secrets, et toutes les collections limitées au compte", async () => {
  const profile = { email: "a@example.test", companyName: "Atelier", companyAddress: "Adresse", companyLogo: "data:image/png;base64,aGVsbG8=", neq: "1234567890", address: "Adresse historique", tpsNumber: "123456789RT0001", tvqNumber: "1234567890TQ0001", password: "secret", stripeCustomerId: "private", id: "a" };
  const queries = [];
  const sql = (parts, ...values) => {
    const query = parts.join("?"); queries.push(query);
    assert.deepEqual(values, ["a"]);
    assert.match(query, /WHERE (?:id|"userId")=\?/);
    if (query.includes('FROM "User"')) {
      assert.doesNotMatch(query, /SELECT \*/);
      const fields = query.slice(7, query.indexOf(" FROM")).replaceAll('"', '').split(',');
      return [Object.fromEntries(fields.map(field => [field, profile[field]]))];
    }
    return [{ userId: "a", id: "owned" }];
  };
  sql.transaction = async (queries, options) => {
    assert.deepEqual(options, { isolationLevel: "RepeatableRead", readOnly: true });
    return queries;
  };
  const response = await route(async () => "a", sql).GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.match(response.headers.get("content-disposition"), /attachment/);
  const data = await response.json();
  for (const field of ["email", "companyName", "companyAddress", "companyLogo", "neq", "address", "tpsNumber", "tvqNumber"]) assert.equal(data.profile[field], profile[field]);
  for (const field of ["password", "stripeCustomerId", "id"]) assert.equal(Object.hasOwn(data.profile, field), false);
  assert.equal(queries.length, 5);
  for (const field of ["clients", "invoices", "quotes", "expenses"]) assert.deepEqual(data[field], [{ userId: "a", id: "owned" }]);
});
test("export : session absente ou limite atteinte, aucune lecture des données", async () => {
  const sql = () => { throw new Error("Lecture non autorisée"); };
  const anonymous = route(async () => { throw new validation.InputError("Session expirée.", 401); }, sql);
  assert.equal((await anonymous.GET()).status, 401);
  const limited = route(async () => "a", sql, async () => { throw new validation.InputError("Trop de demandes.", 429); });
  assert.equal((await limited.GET()).status, 429);
});
