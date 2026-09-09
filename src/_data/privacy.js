import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const path = fileURLToPath(new URL("../../site-data/pages/privacy.json", import.meta.url));

export default JSON.parse(readFileSync(path, "utf8"));
