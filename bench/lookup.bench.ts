import { Bench } from "tinybench";
import { getGender, getNameInfo, preloadFuzzy } from "../src/index.js";

const SAMPLE = ["Maria", "José", "João da Silva", "Ana Paula", "Carlos", "Beatriz", "AABRAO"];
const TYPOS = ["Matteu", "Gabriella", "Joao", "Mariia", "Lucax"];

async function main() {
  // Warm up the lazily-built indexes so we benchmark steady-state lookups.
  getNameInfo("Maria");
  await preloadFuzzy();

  const bench = new Bench({ time: 1000 });
  let i = 0;

  bench
    .add("getGender (exact)", () => {
      getGender(SAMPLE[i++ % SAMPLE.length] as string);
    })
    .add("getNameInfo (exact)", () => {
      getNameInfo(SAMPLE[i++ % SAMPLE.length] as string);
    })
    .add("getGender (fuzzy)", () => {
      getGender(TYPOS[i++ % TYPOS.length] as string, { fuzzy: true });
    });

  await bench.run();
  console.table(bench.table());
}

main();
