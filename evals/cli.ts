import "dotenv/config";
import { main } from "./runner";

main().then((code) => { process.exitCode = code; }).catch(() => {
  // Configuration errors are intentionally not dumped with user or provider payloads.
  process.stderr.write("Eval configuration failed. Check arguments, scenario JSON, server availability and model/key configuration. See evals/README.md.\n");
  process.exitCode = 2;
});
