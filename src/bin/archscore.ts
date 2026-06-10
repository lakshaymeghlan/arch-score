#!/usr/bin/env node
import { run } from "../cli/run.js";

run(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`arch-score: unexpected error: ${(err as Error).stack ?? err}\n`);
    process.exit(2);
  });
