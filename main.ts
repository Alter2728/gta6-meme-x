// main.ts — the entrypoint for make.fun's gta6-meme-x-01 bounty.
//
// Its only job is to carry the post's address from this repository to the
// grader: it copies POST.json from the repository root into the output
// directory. That is all it does — no network, no clock, no files outside
// this repository — so running it twice writes the same bytes every time.

import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const repoDir = process.env.MAKEFUN_BOT_DIR ?? ".";
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";

mkdirSync(outputDir, { recursive: true });
copyFileSync(join(repoDir, "POST.json"), join(outputDir, "POST.json"));
