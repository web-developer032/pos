import { runSeed } from "../lib/db/runSeed";

runSeed()
  .then(() => {
    console.log("Seed completed.");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
