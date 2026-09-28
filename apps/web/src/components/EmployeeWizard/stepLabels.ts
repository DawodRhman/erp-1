export const WIZARD_STEP_LABELS = [
  "Personal Info",
  "Job Info",
  "Account",
  "Emergency Contacts",
  "Bank Info",
  "Medical Info",
  "Salary",
  "Allowances",
] as const;

export type WizardStepLabel = (typeof WIZARD_STEP_LABELS)[number];
