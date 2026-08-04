import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const events = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/events" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    location: z.string(),
    description: z.string(),
    type: z.enum(["event", "workshop"]).default("event"),
  }),
});

export const collections = { events };
