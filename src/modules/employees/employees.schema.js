import { z } from 'zod';

const phoneSchema = z.string().min(7).max(20);
const trimmedRequiredString = (message, max = 100) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1, message).max(max)
  );
const trimmedOptionalString = (max = 100) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed || null;
  }, z.string().max(max).nullable().optional());
const pakistanCountrySchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.literal('Pakistan')
).default('Pakistan');
const dateStringSchema = z.string().min(4).max(15).refine((value) => {
  const year = Number(String(value).slice(0, 4));
  return Number.isFinite(year) && year >= 1900;
}, {
  message: 'Date of birth cannot be before year 1900.',
});

const personalInfoSchema = z.object({
  name: z.string().min(2, 'Full name is mandatory.').max(100),
  father_name: z.string().min(2, 'Father name is mandatory.').max(100),
  cnic: z.string().min(5, 'CNIC number is mandatory.').max(20),
  date_of_birth: dateStringSchema,
});

const jobInfoSchema = z.object({
  department_id: z.string().uuid(),
  designation_id: z.string().uuid(),
  employment_type_id: z.string().uuid(),
  job_status_id: z.string().uuid(),
  work_mode_id: z.string().uuid(),
  work_location_id: z.string().uuid(),
  shift_id: z.string().uuid(),
  date_of_joining: z.string().min(8),
  date_of_exit: z.string().min(8).optional().nullable(),
  probation_end_date: z.string().min(8).optional().nullable(),
  contract_end_date: z.string().min(8).optional().nullable(),
});

const salaryInfoSchema = z.object({
  base_salary: z.number().nonnegative(),
  currency: z.string().length(3).default('PKR'),
  effective_from: z.string().min(8),
  revision_type: z.enum(['Initial', 'Promotion', 'Demotion', 'Increment', 'Decrement', 'Correction', 'Market Adjustment']),
  revision_percent: z.number().nonnegative().optional().nullable(),
  revision_reason: z.string().max(500).optional().nullable(),
});

const accountInfoSchema = z.object({
  email: z.string().email(),
  phone: phoneSchema,
  role_id: z.string().uuid().optional().nullable(),
});

const employeeAddressSchema = z.object({
  country: pakistanCountrySchema,
  province: trimmedRequiredString('Province is mandatory.', 100),
  district: trimmedOptionalString(100),
  city: trimmedRequiredString('City is mandatory.', 100),
  town: trimmedOptionalString(100),
  street: trimmedOptionalString(255),
  postal_code: trimmedOptionalString(20),
});

const employeeContactBaseSchema = z.object({
  primary_phone: phoneSchema,
  alternate_phone: phoneSchema.optional().nullable(),
  same_as_permanent: z.boolean().default(false),
  permanent_address: employeeAddressSchema,
  postal_address: employeeAddressSchema.optional().nullable(),
});

const employeeContactSchema = employeeContactBaseSchema.superRefine((value, ctx) => {
  if (!value.same_as_permanent && !value.postal_address) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['postal_address'],
      message: 'Postal address is mandatory unless it is same as permanent address.',
    });
  }
});

const emergencyContactsSchema = z.object({
  e_contact_1_relation: z.enum(['father', 'mother', 'brother', 'sister', 'wife', 'husband', 'son', 'daughter', 'friend', 'neighbor', 'other']),
  e_contact_1_full_name: z.string().min(2).max(150),
  e_contact_1_phone: phoneSchema,
  e_contact_1_phone_country_code: z.string().max(5).default('+92'),
  e_contact_1_email: z.string().email().optional().nullable(),
  e_contact_2_relation: z.enum(['father', 'mother', 'brother', 'sister', 'wife', 'husband', 'son', 'daughter', 'friend', 'neighbor', 'other']).optional().nullable(),
  e_contact_2_full_name: z.string().max(150).optional().nullable(),
  e_contact_2_phone: phoneSchema.optional().nullable(),
  e_contact_2_phone_country_code: z.string().max(5).default('+92').optional().nullable(),
  e_contact_2_email: z.string().email().optional().nullable(),
  primary_contact: z.number().int().min(1).max(2).default(1),
});

const bankInfoSchema = z.object({
  bank_name: z.string().min(2).max(150),
  branch_name: z.string().max(150).optional().nullable(),
  branch_code: z.string().max(20).optional().nullable(),
  iban: z.string().min(10).max(34),
  account_title: z.string().min(2).max(200),
  account_number: z.string().max(30).optional().nullable(),
  account_type: z.enum(['current', 'savings', 'salary']).optional().nullable(),
});

const allowanceItemSchema = z.object({
  allowance_type_id: z.string().uuid(),
  amount: z.number().nonnegative(),
  is_percentage: z.boolean().default(false),
});

const medicalInfoSchema = z.object({
  blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  height_cm: z.number().int().positive().optional().nullable(),
  weight_kg: z.number().int().positive().optional().nullable(),
  has_disability: z.boolean().default(false),
  disability_type: z.string().max(100).optional().nullable(),
  disability_description: z.string().optional().nullable(),
  has_chronic_condition: z.boolean().default(false),
  chronic_condition_notes: z.string().optional().nullable(),
  has_known_allergies: z.boolean().default(false),
  allergy_notes: z.string().optional().nullable(),
  emergency_medication: z.string().optional().nullable(),
  fitness_status: z.string().max(30).optional().nullable(),
  last_medical_exam_date: z.string().optional().nullable(),
  next_medical_exam_date: z.string().optional().nullable(),
});

export const createEmployeeSchema = z.object({
  employee_id: z.string().min(3).max(10),
  personalInfo: personalInfoSchema,
  jobInfo: jobInfoSchema,
  salaryInfo: salaryInfoSchema,
  accountInfo: accountInfoSchema,
  employeeContact: employeeContactSchema.optional(),
  emergencyContacts: emergencyContactsSchema.optional(),
  bankInfo: bankInfoSchema.optional(),
  medicalInfo: medicalInfoSchema.optional(),
  allowances: z.array(allowanceItemSchema).optional(),
});

export const updatePersonalInfoSchema = personalInfoSchema.partial();

export const updateJobInfoSchema = jobInfoSchema.partial().extend({
  manager_emp_id: z.string().max(10).optional().nullable(),
});

export const updateEmergencyContactsSchema = emergencyContactsSchema.partial();
export const updateEmployeeContactSchema = employeeContactBaseSchema.partial();
export const updateBankInfoSchema = bankInfoSchema.partial();
export const updateMedicalInfoSchema = medicalInfoSchema.partial();

export const updateExtraInfoSchema = z.object({
  employeeContact: updateEmployeeContactSchema.optional(),
  emergencyContacts: updateEmergencyContactsSchema.optional(),
  bankInfo: updateBankInfoSchema.optional(),
  medicalInfo: updateMedicalInfoSchema.optional(),
});

export const salaryRevisionSchema = salaryInfoSchema;

export const updateAllowancesSchema = z.object({
  allowances: z.array(allowanceItemSchema),
});
