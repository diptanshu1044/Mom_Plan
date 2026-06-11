import { z } from 'zod';

const billablePlanSchema = z.enum(['partner', 'network']);
const billingIntervalSchema = z.enum(['monthly', 'yearly']).default('yearly');

export const checkoutBodySchema = z.object({
  body: z.object({
    plan: billablePlanSchema,
    interval: billingIntervalSchema.optional(),
  }),
});

export const upgradeBodySchema = z.object({
  body: z.object({
    plan: billablePlanSchema,
    interval: billingIntervalSchema.optional(),
  }),
});

export const activateCommunityBodySchema = z.object({
  body: z.object({}).optional(),
});
