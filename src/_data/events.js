import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { deriveEvents } from "./derive-events.js";

const path = fileURLToPath(new URL("../../site-data/events.json", import.meta.url));
const events = JSON.parse(readFileSync(path, "utf8"));

export default deriveEvents(events);
