import { z } from 'zod';

export const validateZipSchema = z.object({
  body: z.object({
    zip: z.string().min(1, 'ZIP code is required'),
    state: z.string().length(2, 'State must be a 2-letter abbreviation'),
  }),
});
