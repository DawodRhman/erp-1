import { z } from "zod";

const phoneSchema = z.string().min(7).max(20);

export const medicalInfoSchema = z.object({
  blood_group: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"])
    .optional()
    .nullable(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
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

export const createEmployeeMedicalSchemaDetails = {
  blood_group: "A+, A-, B+, B-, AB+, AB-, O+, O-, unknown; nullable",
  date_of_birth: "string; nullable",
  gender: "male, female, other; nullable",
  height_cm: "positive integer; nullable",
  weight_kg: "positive integer; nullable",
  has_disability: "boolean; defaults false",
  disability_type: "string; max 100 characters; nullable",
  disability_description: "string; nullable",
  has_chronic_condition: "boolean; defaults false",
  chronic_condition_notes: "string; nullable",
  has_known_allergies: "boolean; defaults false",
  allergy_notes: "string; nullable",
  emergency_medication: "string; nullable",
  fitness_status: "string; max 30 characters; nullable",
  last_medical_exam_date: "string; nullable",
  next_medical_exam_date: "string; nullable",
} as const;

export const createEmployeeSchema = z.object({
  employee_id: z.string().min(3).max(10),
  personalInfo: z.object({
    name: z.string().min(2).max(100),
    father_name: z.string().min(2).max(100),
    cnic: z.string().min(5).max(20),
    date_of_birth: z.string().min(4).max(15),
  }),
  jobInfo: z.object({
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
  }),
  salaryInfo: z.object({
    base_salary: z.number().nonnegative(),
    currency: z.string().length(3).default("PKR"),
    effective_from: z.string().min(8),
    revision_type: z.enum([
      "Initial",
      "Promotion",
      "Demotion",
      "Increment",
      "Decrement",
      "Correction",
      "Market Adjustment",
    ]),
    revision_percent: z.number().nonnegative().optional().nullable(),
    revision_reason: z.string().max(500).optional().nullable(),
  }),
  accountInfo: z.object({
    email: z.string().email(),
    phone: phoneSchema,
    role_id: z.string().uuid().optional().nullable(),
  }),
  medicalInfo: medicalInfoSchema.optional(),
});
