import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const output = mkdtempSync(join(tmpdir(), "qf-domain-tests-"));
try {
  const compile = spawnSync(
    process.execPath,
    [
      "node_modules/typescript/bin/tsc",
      "lib/validation.ts",
      "lib/money.ts",
      "--outDir",
      output,
      "--module",
      "commonjs",
      "--target",
      "es2020",
      "--skipLibCheck",
      "--esModuleInterop",
    ],
    { stdio: "inherit" },
  );
  if (compile.status) process.exitCode = compile.status;
  else {
    const result = spawnSync(
      process.execPath,
      [
        "--test",
        "tests/domain.test.mjs",
        "tests/session.test.mjs",
        "tests/clients-route.test.mjs",
        "tests/export-route.test.mjs",
      ],
      { stdio: "inherit", env: { ...process.env, QF_TEST_BUILD: output } },
    );
    process.exitCode = result.status ?? 1;
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
