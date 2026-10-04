// Editable assumptions — shown in the ExplainDrawer as "افتراضات قابلة للتعديل".
export const ASSUMPTIONS = {
  weeksPerGap: 4, // per 25-point gap
  costPerGap: 6000, // SAR per 25-point gap
  externalSenior: { weeks: 12, cost: 45000 },
  externalJunior: { weeks: 8, cost: 20000 },
  externalDataEngineer: { weeks: 14, cost: 50000 },
  materialWeight: 15, // gaps in skills weighing less than this don't delay readiness
  coverThreshold: 75, // min match % for an internal cover
}

// Cost of a failed promotion vs. a development plan (SAR). Estimates, editable on screen.
export const PROMOTION_COST = {
  replacementHiring: 45000, // finding and onboarding a replacement
  productivityLoss: 60000, // a struggling manager's team output
  teamTurnover: 30000, // team members who leave
  developmentPlan: 20000, // mentoring + time on a small project
}
