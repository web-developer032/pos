/**
 * Plan-based feature gating. Single source of truth for which features each plan includes.
 * "users" (admin panel) is role-based only, not plan-based.
 */

export type PlanType = "basic" | "pro" | "enterprise";

export const FEATURE_KEYS = [
  "dashboard",
  "pos",
  "products",
  "categories",
  "suppliers",
  "customers",
  "inventory",
  "purchase_orders",
  "sales",
  "cash_register",
  "reports",
  "employees",
  "finance",
  "settings",
  "print_settings",
  "barcode_generator",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

/** Features included in each plan. Basic < Pro < Enterprise. */
export const PLAN_FEATURES: Record<PlanType, readonly FeatureKey[]> = {
  basic: [
    "dashboard",
    "pos",
    "products",
    "categories",
    "sales",
    "cash_register",
  ],
  pro: [
    "dashboard",
    "pos",
    "products",
    "categories",
    "suppliers",
    "customers",
    "inventory",
    "purchase_orders",
    "sales",
    "cash_register",
    "reports",
  ],
  enterprise: [...FEATURE_KEYS],
};

/** Get the set of enabled feature keys for a plan. */
export function getEnabledFeatures(plan: PlanType): Set<FeatureKey> {
  return new Set(PLAN_FEATURES[plan] ?? []);
}

/** Check if a plan includes a feature. */
export function hasFeature(plan: PlanType, feature: FeatureKey): boolean {
  const features = PLAN_FEATURES[plan];
  if (!features) return false;
  return (features as readonly string[]).includes(feature);
}

/** Check if a plan (or null/undefined) includes a feature. Admins bypass plan checks for non-users features; plan is still used for feature gating. */
export function hasFeatureForPlan(
  plan: PlanType | null | undefined,
  feature: FeatureKey
): boolean {
  if (plan == null) return false;
  return hasFeature(plan, feature);
}
