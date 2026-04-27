import { z } from 'zod';

const phoneSchema = z.string().min(7).max(20);

const personalInfoSchema = z.object({
  name: z.string().min(2).max(100),
  father_name: z.string().min(2).max(100),
  cnic: z.string().min(5).max(20),
  date_of_birth: z.string().min(4).max(15),
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

const salaryInfoSchema = z
  .object({
    base_salary: z.number().nonnegative().optional(),
  })
  .optional();

const accountInfoSchema = z.object({
  email: z.string().email(),
  phone: phoneSchema,
  role_id: z.string().uuid().optional().nullable(),
});

const extraInfoSchema = z
  .object({
    contact_1: phoneSchema.optional(),
    contact_2: phoneSchema.optional().nullable(),
    emergence_contact_1: phoneSchema.optional().nullable(),
    emergence_contact_2: phoneSchema.optional().nullable(),
    bank_name: z.string().max(120).optional().nullable(),
    bank_acc_num: z.string().max(50).optional().nullable(),
    perment_address: z.string().max(300).optional().nullable(),
    postal_address: z.string().max(300).optional().nullable(),
  })
  .optional();

export const createEmployeeSchema = z.object({
  personalInfo: personalInfoSchema,
  jobInfo: jobInfoSchema,
  salaryInfo: salaryInfoSchema,
  accountInfo: accountInfoSchema,
  extraInfo: extraInfoSchema,
});

export const updatePersonalInfoSchema = personalInfoSchema.partial();

export const updateJobInfoSchema = jobInfoSchema.partial().extend({
  manager_emp_id: z.string().max(10).optional().nullable(),
});

export const updateExtraInfoSchema = z.object({
  contact_1: phoneSchema.optional(),
  contact_2: phoneSchema.optional().nullable(),
  emergence_contact_1: phoneSchema.optional().nullable(),
  emergence_contact_2: phoneSchema.optional().nullable(),
  bank_name: z.string().max(120).optional().nullable(),
  bank_acc_num: z.string().max(50).optional().nullable(),
  perment_address: z.string().max(300).optional().nullable(),
  postal_address: z.string().max(300).optional().nullable(),
});
