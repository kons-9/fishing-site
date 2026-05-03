import { defineCollection, z, reference } from 'astro:content';
import { glob } from 'astro/loaders';

const gearCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/gear" }),
  schema: ({ image }) => z.object({
    name: z.string(),
    category: z.enum([
      'rod', 'reel', 'lure', 'rig', 'wear', 'accessory'
    ]),
    bestTargets: z.array(z.string()),
    possibleTargets: z.array(z.string()).default([]),
    brand: z.string().optional(),
    photo: image().optional(),
    specs: z.record(z.string()).optional(),
    lineCapacity: z.array(z.object({
      lineType: z.string(), // PE, ナイロン, フロロ
      thickness: z.string(), // 号数やlb
      length: z.string().optional(), // 糸巻量 (例: 200m)
    })).optional(),
    spools: z.array(z.object({
      name: z.string(), // メイン, 替え1 など
      currentLine: z.object({
        lineType: z.string(),
        thickness: z.string(),
        length: z.string().optional(),
        memo: z.string().optional(),
      }).optional()
    })).optional(),
    rating: z.number().min(1).max(5).optional(),
    review: z.string().optional(),
    purchaseDate: z.coerce.date().optional(),
    price: z.number().optional(),
    draft: z.boolean().default(false),
  }),
});

const diaryCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/diary" }),
  schema: ({ image }) => z.object({
    date: z.coerce.date(), // 表示用・ソート用のメイン日付
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    timeRange: z.string().optional(),
    location: z.string(),
    target: z.string(),
    catches: z.array(z.object({
      species: z.string(),
      size: z.string().optional(),
      count: z.number().default(1),
    })).default([]),
    tide: z.object({
      type: z.enum([
        '大潮', '中潮', '小潮', '長潮', '若潮'
      ]),
      flow: z.string().optional(),
    }),
    weather: z.string().optional(),
    temperature: z.object({
      air: z.number().optional(),
      water: z.number().optional(),
    }).optional(),
    wind: z.object({
      direction: z.string().optional(),
      speed: z.number().optional(),
    }).optional(),
    hitLure: z.string().optional(),
    gear: z.array(reference('gear')).optional(),
    photos: z.array(image()).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  'gear': gearCollection,
  'diary': diaryCollection,
};
