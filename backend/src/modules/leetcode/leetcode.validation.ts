import { z } from 'zod';

export const connectLeetCodeSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'LeetCode username is required').max(64),
  }),
});
