import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const candles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/candles" }),
  schema: z.object({
    name: z.string(),
    scent: z.string(),
    description: z.string(),
    price: z.number(),
    image: z.string().optional(),
    order: z.number().default(0),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/events" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    location: z.string(),
    description: z.string(),
    isPast: z.boolean().default(false),
  }),
});

export const collections = { candles, events };
