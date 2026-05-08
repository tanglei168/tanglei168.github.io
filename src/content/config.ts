import { defineCollection, z } from 'astro:content'

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional().default(true),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
  }),
})

const tickerItemSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  weight: z.number(),
  tier: z.enum(['core', 'satellite', 'theme', 'avoid', 'watch']),
  thesis: z.string(),
})

const dashboard = defineCollection({
  type: 'data',
  schema: z.object({
    holdings: z.object({
      cn: z.array(tickerItemSchema),
      us: z.array(tickerItemSchema),
    }),
    indicators: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['red_flag', 'amber_flag']),
      threshold: z.string(),
      source: z.string(),
    })),
    hype_assessment: z.object({
      dimensions: z.array(z.string()),
      domains: z.array(z.object({
        id: z.string(),
        name: z.string(),
        scores: z.array(z.number()).length(8),
        verdict: z.string(),
      })),
    }),
  }),
})

export const collections = { blog, dashboard }
