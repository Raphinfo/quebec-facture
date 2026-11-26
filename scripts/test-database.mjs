import { spawnSync, spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
const name = `qf-test-${process.pid}`;
function run(args, input) {
  const r = spawnSync("docker", args, { input, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return r.stdout;
}
function sql(input) {
  return run(
    [
      "exec",
      "-i",
      name,
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
    ],
    input,
  );
}
try {
  run([
    "run",
    "--detach",
    "--rm",
    "--name",
    name,
    "--network",
    "none",
    "--tmpfs",
    "/var/lib/postgresql/data",
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "postgres:17-alpine",
  ]);
  let ready = false;
  for (let i = 0; i < 100; i++) {
    const r = spawnSync(
      "docker",
      ["exec", name, "pg_isready", "-U", "postgres"],
      { stdio: "ignore" },
    );
    const logs = spawnSync("docker", ["logs", name], { encoding: "utf8" });
    if (
      r.status === 0 &&
      (logs.stdout + logs.stderr).includes("PostgreSQL init process complete")
    ) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw new Error("PostgreSQL indisponible.");
  for (const directory of readdirSync("prisma/migrations").sort()) {
    if (directory === "migration_lock.toml") continue;
    sql(readFileSync(`prisma/migrations/${directory}/migration.sql`, "utf8"));
    console.log(`Migration ${directory} : OK`);
  }
  sql(readFileSync("tests/database.integration.sql", "utf8"));
  console.log("Tests transactionnels : OK");
  sql(
    `INSERT INTO "User" (id,email,password,"companyName","companyAddress") VALUES ('concurrent','concurrent@example.test','test','Entreprise','Adresse');INSERT INTO "Client" (id,name,"userId") VALUES (999,'Client','concurrent');`,
  );
  const doc = JSON.stringify({
    items: [{ description: "Test", amount: 10 }],
    amountSubtotal: 10,
    tpsAmount: 0,
    tvqAmount: 0,
    amountTotal: 10,
  });
  await Promise.all(
    Array.from(
      { length: 8 },
      (_, i) =>
        new Promise((resolve, reject) => {
          const p = spawn("docker", [
            "exec",
            "-i",
            name,
            "psql",
            "-U",
            "postgres",
            "-v",
            "ON_ERROR_STOP=1",
            "-At",
          ]);
          let err = "";
          p.stderr.on("data", (d) => (err += d));
          p.stdout.resume();
          p.on("exit", (code) => (code ? reject(new Error(err)) : resolve()));
          p.stdin.end(
            `SELECT qf_issue_invoice('concurrent',999,'${doc}'::jsonb,NULL,'parallel-${i}');`,
          );
        }),
    ),
  );
  const count = sql(
    `SELECT count(*) FROM "Invoice" WHERE "userId"='concurrent';`,
  ).trim();
  if (count !== "3")
    throw new Error(`Quota concurrent : ${count} factures au lieu de 3`);
  console.log("8 émissions simultanées : exactement 3 factures, OK");
  // Sauvegarde/restauration exclusivement dans le conteneur jetable de ce test.
  const dump = run(["exec", name, "pg_dump", "-U", "postgres", "--no-owner", "--no-acl", "postgres"]);
  run(["exec", name, "createdb", "-U", "postgres", "qf_restored"]);
  run(["exec", "-i", name, "psql", "-U", "postgres", "-d", "qf_restored", "-v", "ON_ERROR_STOP=1"], dump);
  const tables = sql("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").trim().split("\n");
  for (const table of tables) {
    const escaped = table.replaceAll('"', '""');
    const query = `SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY row_to_json(t)::text),'[]'::jsonb) FROM "${escaped}" t;`;
    const before = sql(query);
    const after = run(["exec", "-i", name, "psql", "-U", "postgres", "-d", "qf_restored", "-v", "ON_ERROR_STOP=1", "-At"], query);
    if (before !== after) throw new Error(`Restauration différente : ${table}`);
  }
  run(["exec", "-i", name, "psql", "-U", "postgres", "-d", "qf_restored", "-v", "ON_ERROR_STOP=1"], readFileSync("tests/database.integration.sql", "utf8"));
  console.log("Sauvegarde/restauration : toutes les tables identiques et contrôles métier rejoués, OK");
} finally {
  spawnSync("docker", ["stop", name], { stdio: "ignore" });
}
