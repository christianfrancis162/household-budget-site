// HomeLedger v2 hand-in program (Node 22, standard library only).
//
// It gathers the site — app/ and screenshots/ from beside this file — into
// the output directory and writes dossier.json there with the kit's vendored
// buildDossier from vendor/makefun-frontend.ts, which must stay untouched:
// the scorer rebuilds the dossier with its own copy and compares bytes.
//
// v2: the dashboard names the household (the Okafor family of Lekki, Lagos)
// and shows its real 50/30/20 split against the rule, with a verdict on
// what to do about it; every form now confirms what it did.
//
// Run it locally like this:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The grader runs it with /output as the target instead.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

// The repository root is the directory holding this file.
const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

function copyDirIfPresent(name) {
  const from = join(repoRoot, name);
  if (!existsSync(from)) return;
  cpSync(from, join(outputDir, name), { recursive: true });
}

// Start from a clean output directory so a stale file can never ride along.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
copyDirIfPresent("app");
copyDirIfPresent("screenshots");

// The scorer's own caps, from the kit's reference gate: the dossier text is
// capped at 160 KiB; at most 4 screenshots and none over 256 KiB; app/ holds
// at most 993 files and directories and 16 MiB in all. Anything past those
// limits is an entry the scorer refuses, so buildDossier refuses it here.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(outputDir, "dossier.json"), dossier);
console.log("HomeLedger v2 dossier written to " + join(outputDir, "dossier.json"));
