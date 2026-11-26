import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import ts from "typescript";
const nodeRequire = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const source = readFileSync(file, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)(
    (id) => (Object.hasOwn(mocks, id) ? mocks[id] : nodeRequire(id)),
    mod,
    mod.exports,
  );
  return mod.exports;
}
const validation = load(resolve("lib/validation.ts"));
function sessionHarness(values, rows = []) {
  const queries = [];
  const sql = (strings, ...params) => {
    queries.push({ query: strings.join("?"), params });
    return Promise.resolve(rows);
  };
  sql.transaction = async (queries) => Promise.all(queries);
  const session = load(resolve("lib/session.ts"), {
    "next/headers": {
      cookies: async () => ({
        get: (name) => (values[name] ? { value: values[name] } : undefined),
      }),
    },
    "./db": { getDb: () => sql },
    "./validation": validation,
  });
  return { session, queries };
}
test("un ancien cookie contenant un identifiant utilisateur ne donne aucun accès", async () => {
  const { session, queries } = sessionHarness({ user_session: "victim-id" });
  assert.equal(await session.getSessionUserId(), null);
  assert.equal(queries.length, 0);
  await assert.rejects(
    () => session.requireUser(),
    (e) => e.status === 401,
  );
});
test("un cookie de session mal formé est rejeté avant la base", async () => {
  const { session, queries } = sessionHarness({ qf_session: "a-user-uuid" });
  assert.equal(await session.getSessionUserId(), null);
  assert.equal(queries.length, 0);
});
test("une session valide est retrouvée par son hachage et son expiration", async () => {
  const token = "a".repeat(64),
    { session, queries } = sessionHarness({ qf_session: token }, [
      { userId: "owner" },
    ]);
  assert.equal(await session.requireUser(), "owner");
  assert.equal(queries[0].params[0], session.hashToken(token));
  assert.notEqual(queries[0].params[0], token);
  assert.match(queries[0].query, /expiresAt.*NOW/);
});
test("une session révoquée ou expirée ne donne aucun accès", async () => {
  const { session } = sessionHarness({ qf_session: "b".repeat(64) }, []);
  await assert.rejects(
    () => session.requireUser(),
    (e) => e.status === 401,
  );
});
test("la déconnexion révoque le jeton côté serveur", async () => {
  const token = "c".repeat(64),
    { session, queries } = sessionHarness({ qf_session: token });
  await session.revokeSession();
  assert.match(queries[0].query, /DELETE FROM "Session"/);
  assert.equal(queries[0].params[0], session.hashToken(token));
});
test("une nouvelle connexion produit un jeton aléatoire protégé, jamais l’identifiant du compte", async () => {
  const { session, queries } = sessionHarness({});
  const set = [],
    deleted = [];
  await session.createSession("account-id", {
    cookies: {
      set: (...args) => set.push(args),
      delete: (name) => deleted.push(name),
    },
  });
  assert.match(set[0][1], /^[a-f0-9]{64}$/);
  assert.equal(set[0][2].httpOnly, true);
  assert.equal(set[0][2].sameSite, "lax");
  assert.ok(deleted.includes("user_session"));
  assert.ok(
    queries.some(
      (q) =>
        q.query.includes('INSERT INTO "Session"') &&
        q.params[0] === session.hashToken(set[0][1]),
    ),
  );
});
