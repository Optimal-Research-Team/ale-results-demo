/* ==========================================================================
   Contract mirrors — kit/shared/lib/ale/constants.ts (never hard-code the name)
   ========================================================================== */
const PRODUCT_NAME = 'Annual Longevity Assessment';
const STATE_ORDER = ['optimal', 'in_range', 'borderline', 'out_of_range'];
const STATE_LABEL = { optimal: 'Optimal', in_range: 'In range', borderline: 'Borderline', out_of_range: 'Out of range' };
const STATE_DEFINITION = {
  optimal: "Within our clinic's longevity target.",
  in_range: "Within the lab's reference range, outside our longevity target.",
  borderline: 'Close to the edge of the range. Worth working on.',
  out_of_range: "Outside the lab's reference range. Your NP will discuss it with you.",
};
const STATE_RANK = { optimal: 3, in_range: 2, borderline: 1, out_of_range: 0 };
const SYSTEM_ORDER = ['heart', 'metabolic', 'hormones', 'thyroid', 'liver', 'kidney', 'inflammation', 'nutrients', 'blood', 'electrolytes', 'urine'];
const SYSTEM_LABEL = { heart: 'Heart & lipids', metabolic: 'Metabolic', hormones: 'Hormones', thyroid: 'Thyroid', liver: 'Liver', kidney: 'Kidney',
  inflammation: 'Inflammation & iron', nutrients: 'Vitamins & minerals', blood: 'Blood count', electrolytes: 'Electrolytes', urine: 'Urinalysis' };
const PRESENT_MAX_MINUTES = 60;
const CLINIC = { name: 'Optimal Health Clinic', city: 'Barrie, ON', email: 'care@beoptimal.ca', phone: '(437) 370-0291' };

/* Synthetic fixture — Patient A (BUILD-SPEC §8). Fictional. The view model
   carries the first name only (PHIPA rule 7): no surname, DOB or health card.
   ========================================================================== */
