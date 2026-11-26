import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, mocks) {
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name) => (Object.hasOwn(mocks, name) ? mocks[name] : require(name)),
    mod,
    mod.exports,
  );
  return mod.exports;
}
const validation = load("lib/validation.ts", {});
const http = load("lib/http.ts", { "./validation": validation });
function route({ requireUser = async () => "account-a", sql }) {
  return load("app/api/clients/route.ts", {
    "@/lib/session": { requireUser },
    "@/lib/db": { getDb: () => sql },
    "@/lib/http": http,
    "@/lib/validation": validation,
  });
}
const request = (body) =>
  new Request("http://localhost/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test("la création renvoie le client exact pour sa sélection et utilise le compte authentifié", async () => {
  const created = {
    id: 42,
    name: "Studio",
    company: "Atelier",
    email: "client@example.test",
  };
  const { POST } = route({
    sql: async (strings, ...values) => {
      assert.match(strings.join("?"), /RETURNING id,name,company,email/);
      assert.deepEqual(values, [
        "account-a",
        "Studio",
        "Atelier",
        "1234567890",
        "Adresse",
        "client@example.test",
        "418 555 0100",
      ]);
      return [created];
    },
  });
  const response = await POST(
    request({
      userId: "other-account",
      name: " Studio ",
      company: "Atelier",
      neq: "1234567890",
      address: "Adresse",
      email: "CLIENT@example.test",
      phone: "418 555 0100",
    }),
  );
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    message: "Client ajouté.",
    client: created,
  });
});

test("un client invalide est refusé avant toute écriture", async () => {
  let writes = 0;
  const { POST } = route({
    sql: async () => {
      writes++;
      return [];
    },
  });
  for (const body of [
    { name: "" },
    { name: "Studio", email: "invalide" },
    { name: "Studio", phone: "x".repeat(41) },
  ]) {
    const response = await POST(request(body));
    assert.equal(response.status, 400);
    assert.ok((await response.json()).error);
  }
  assert.equal(writes, 0);
});

test("aucun client n’est créé sans session", async () => {
  let writes = 0;
  const { POST } = route({
    requireUser: async () => {
      throw new validation.InputError("Session expirée.", 401);
    },
    sql: async () => {
      writes++;
      return [];
    },
  });
  assert.equal((await POST(request({ name: "Studio" }))).status, 401);
  assert.equal(writes, 0);
});
