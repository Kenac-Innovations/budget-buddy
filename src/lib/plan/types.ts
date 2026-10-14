import { z } from "zod";

/**
 * The living plan: the shared contract between the advisor, the UI, persistence, pricing and export.
 * Objectives → initiatives → budget lines. Changed only through operations (./ops.ts).
 */

export const Role = z.enum(["CIO", "CTO", "CSO", "ICT_MANAGER", "OTHER"]);
export type Role = z.infer<typeof Role>;

/** Who proposed or changed something. Only the user accepts or dismisses. */
export const Actor = z.enum(["advisor", "user"]);
export type Actor = z.infer<typeof Actor>;

/** Advisor proposals start as "proposed"; the user accepts or sets them aside. */
export const ItemState = z.enum(["proposed", "accepted", "dismissed"]);
export type ItemState = z.infer<typeof ItemState>;

export const Disposition = z.enum(["fund", "pilot", "investigate", "defer"]);
export type Disposition = z.infer<typeof Disposition>;

export const Source = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url().optional(),
  /** YYYY-MM or YYYY-MM-DD. Every factual source carries a date. */
  date: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),
  /** "trend_brief" = Kenac's reviewed brief; "web" = public source; "user" = the CTO said it. */
  kind: z.enum(["trend_brief", "web", "user"]),
});
export type Source = z.infer<typeof Source>;

export const Profile = z.object({
  role: Role.optional(),
  sector: z.string().max(80).optional(),
  /** Bands, never exact figures: e.g. "100–250". */
  staffBand: z.string().max(20).optional(),
  siteBand: z.string().max(20).optional(),
  isPublicEntity: z.boolean().optional(),
  /** Financial year, YYYY-MM. Defaults to the calendar year 2027. */
  periodStart: z.string().regex(/^\d{4}-\d{2}$/).default("2027-01"),
  periodEnd: z.string().regex(/^\d{4}-\d{2}$/).default("2027-12"),
  reportingCurrency: z.string().length(3).default("USD"),
});
export type Profile = z.infer<typeof Profile>;

export const Objective = z.object({
  id: z.string(),
  title: z.string().min(1).max(160),
  /** How they'll know it worked, e.g. "Branch downtime under 4 hours a month". */
  measure: z.string().max(200).optional(),
  state: ItemState,
  createdBy: Actor,
});
export type Objective = z.infer<typeof Objective>;

export const Initiative = z.object({
  id: z.string(),
  objectiveId: z.string(),
  title: z.string().min(1).max(160),
  disposition: Disposition,
  /** The advisor's reason, in one or two sentences. */
  rationale: z.string().max(600),
  /** What's hype or premature for this organisation, if anything. */
  caution: z.string().max(400).optional(),
  /** True when the advisor raised it unprompted ("Spotted"). */
  proactive: z.boolean().default(false),
  sources: z.array(Source).max(6).default([]),
  state: ItemState,
  dismissReason: z.string().max(300).optional(),
  createdBy: Actor,
});
export type Initiative = z.infer<typeof Initiative>;

export const Frequency = z.enum(["one_off", "monthly", "quarterly", "annual"]);
export const PriceBasis = z.enum(["per_unit", "bundle"]);

/** Matches src/lib/sourcing/evidence.ts EvidenceType. */
export const EvidenceType = z.enum([
  "OPERATOR_PRICE_LIST",
  "PUBLISHED_PRICE",
  "QUOTE",
  "CONTRACT",
  "HISTORICAL_ACTUAL",
  "USER_ESTIMATE",
]);

export const LinePrice = z.object({
  /** Decimal string, e.g. "1149.00". Never a float. */
  unitPrice: z.string().regex(/^\d+(\.\d{1,6})?$/),
  currency: z.string().length(3),
  evidence: z.object({
    type: EvidenceType,
    reference: z.string().min(1).max(300),
    capturedAt: z.string(), // ISO date
    validUntil: z.string().optional(),
    supplier: z.object({ name: z.string(), isOperator: z.boolean() }).optional(),
  }),
  /**
   * The specific product behind a sourced price (Kenac price-list items). Only set at the
   * sourcing stage, never during advice. imageUrl is a Kenac-supplied asset path or https URL.
   */
  product: z
    .object({
      sku: z.string().max(60),
      name: z.string().max(160),
      imageUrl: z
        .string()
        .max(500)
        .refine((u) => u.startsWith("/") || u.startsWith("https://"), "Image must be a local path or https URL")
        .optional(),
    })
    .optional(),
});
export type LinePrice = z.infer<typeof LinePrice>;

export const PlanLine = z.object({
  id: z.string(),
  /** Null for items not tied to an initiative (e.g. carried-forward renewals). */
  initiativeId: z.string().nullable(),
  title: z.string().min(1).max(160),
  category: z.string().max(60),
  quantity: z.number().positive().nullable(),
  unit: z.string().max(30).optional(),
  priceBasis: PriceBasis.default("per_unit"),
  frequency: Frequency,
  /** First payment month, YYYY-MM. */
  paymentMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  /** A cost people usually forget (implementation, training, disposal…). */
  forgottenCost: z.boolean().default(false),
  /** Null = Unpriced. Set only through price_line, which enforces the evidence policy. */
  price: LinePrice.nullable(),
  note: z.string().max(300).optional(),
  /** Per-line consent to share with Kenac (journey stage 7). */
  sharedWithKenac: z.boolean().default(false),
  shareAllocation: z.boolean().default(false),
  state: ItemState,
  createdBy: Actor,
});
export type PlanLine = z.infer<typeof PlanLine>;

export const Plan = z.object({
  version: z.number().int().nonnegative(),
  profile: Profile,
  objectives: z.array(Objective),
  initiatives: z.array(Initiative),
  lines: z.array(PlanLine),
  /** Monotonic counter for short, readable ids: o1, i1, l1. */
  nextId: z.number().int().positive(),
});
export type Plan = z.infer<typeof Plan>;

export function emptyPlan(): Plan {
  return Plan.parse({ version: 0, profile: {}, objectives: [], initiatives: [], lines: [], nextId: 1 });
}
