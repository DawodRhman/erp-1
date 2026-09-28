import { describe, expect, it } from 'vitest';
import { createEmployeeSchema, updateAllowancesSchema } from './employees.schema.js';

function validPayload() {
  return {
    employee_id: 'EMP0764',
    personalInfo: {
      name: 'Frontend Employee',
      father_name: 'Parent Name',
      cnic: '42101-9999999-1',
      date_of_birth: '1995-01-15',
    },
    jobInfo: {
      department_id: '11111111-1111-4111-8111-111111111111',
      designation_id: '22222222-2222-4222-8222-222222222222',
      employment_type_id: '33333333-3333-4333-8333-333333333333',
      job_status_id: '44444444-4444-4444-8444-444444444444',
      work_mode_id: '55555555-5555-4555-8555-555555555555',
      work_location_id: '66666666-6666-4666-8666-666666666666',
      shift_id: '77777777-7777-4777-8777-777777777777',
      date_of_joining: '2026-05-22',
    },
    salaryInfo: {
      base_salary: 50000,
      currency: 'PKR',
      effective_from: '2026-05-22',
      revision_type: 'Initial',
    },
    accountInfo: {
      email: 'frontend.employee@example.com',
      phone: '03000000000',
      role_id: null,
    },
  };
}

describe('createEmployeeSchema', () => {
  it('requires the EMP0001 employee id format', () => {
    const payload = validPayload();
    payload.employee_id = 'EMP764';

    const result = createEmployeeSchema.safeParse(payload);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['employee_id'],
        message: 'Employee ID must use EMP0001 format.',
      })
    );
  });

  it('blocks date of birth before year 1900 with a user-facing message', () => {
    const payload = validPayload();
    payload.personalInfo.date_of_birth = '1899-01-01';

    const result = createEmployeeSchema.safeParse(payload);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['personalInfo', 'date_of_birth'],
        message: 'Date of birth cannot be before year 1900.',
      })
    );
  });

  it('accepts structured employee contact and keeps emergency contacts separate', () => {
    const payload = validPayload();
    payload.employeeContact = {
      primary_phone: '03000000000',
      alternate_phone: '03111111111',
      same_as_permanent: false,
      permanent_address: {
        country: 'Pakistan',
        province: 'Punjab',
        district: 'Lahore',
        city: 'Lahore',
        town: 'Gulberg',
        street: 'House 12, Main Boulevard',
        postal_code: '54000',
      },
      postal_address: {
        country: 'Pakistan',
        province: 'Punjab',
        district: 'Lahore',
        city: 'Lahore',
        town: 'Model Town',
        street: 'Office 4',
        postal_code: '54700',
      },
    };
    payload.emergencyContacts = {
      e_contact_1_relation: 'father',
      e_contact_1_full_name: 'Emergency Person',
      e_contact_1_phone: '03222222222',
      e_contact_1_phone_country_code: '+92',
      primary_contact: 1,
    };

    const result = createEmployeeSchema.safeParse(payload);

    expect(result.success).toBe(true);
    expect(result.data.emergencyContacts.contact_1).toBeUndefined();
    expect(result.data.employeeContact.permanent_address.city).toBe('Lahore');
  });

  it('validates employee contact phone and mandatory Pakistan city fields', () => {
    const payload = validPayload();
    payload.employeeContact = {
      primary_phone: '123',
      same_as_permanent: false,
        permanent_address: {
          country: 'Pakistan',
          province: 'Custom Province',
          city: '',
        },
    };

    const result = createEmployeeSchema.safeParse(payload);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['employeeContact', 'primary_phone'],
        }),
        expect.objectContaining({
          path: ['employeeContact', 'permanent_address', 'city'],
        }),
      ])
    );
  });

  it('accepts custom Pakistan provinces added by HR', () => {
    const payload = validPayload();
    payload.employeeContact = {
      primary_phone: '03000000000',
      same_as_permanent: true,
      permanent_address: {
        country: 'Pakistan',
        province: 'Custom Province',
        city: 'Custom City',
      },
    };

    const result = createEmployeeSchema.safeParse(payload);

    expect(result.success).toBe(true);
  });

  it('trims and null-normalizes employee address text fields', () => {
    const payload = validPayload();
    payload.employeeContact = {
      primary_phone: '03000000000',
      same_as_permanent: true,
      permanent_address: {
        country: 'Pakistan',
        province: '  Punjab  ',
        district: '   ',
        city: '  Lahore  ',
        town: '  Gulberg  ',
        street: '  Main Boulevard  ',
        postal_code: '  54000  ',
      },
    };

    const result = createEmployeeSchema.safeParse(payload);

    expect(result.success).toBe(true);
    expect(result.data.employeeContact.permanent_address).toMatchObject({
      province: 'Punjab',
      district: null,
      city: 'Lahore',
      town: 'Gulberg',
      street: 'Main Boulevard',
      postal_code: '54000',
    });
  });

  it('rejects non-Pakistan employee address countries', () => {
    const payload = validPayload();
    payload.employeeContact = {
      primary_phone: '03000000000',
      same_as_permanent: true,
      permanent_address: {
        country: 'United Arab Emirates',
        province: 'Punjab',
        city: 'Lahore',
      },
    };

    const result = createEmployeeSchema.safeParse(payload);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['employeeContact', 'permanent_address', 'country'],
      })
    );
  });

  it('validates bank info details including IBAN and account number constraints', () => {
    const payload = validPayload();
    payload.bankInfo = {
      bank_name: 'Habib Bank Limited',
      branch_name: 'Main Branch',
      branch_code: '0123',
      iban: 'PK00XXXX0000000000000000', // 24 chars
      account_title: 'John Doe',
      account_number: '123456789012345678901234567890', // 30 chars
      account_type: 'current',
    };

    const result = createEmployeeSchema.safeParse(payload);
    expect(result.success).toBe(true);

    // Test invalid IBAN (less than 10 characters)
    payload.bankInfo.iban = 'PK00';
    const resultMinIban = createEmployeeSchema.safeParse(payload);
    expect(resultMinIban.success).toBe(false);

    // Test invalid IBAN (more than 34 characters)
    payload.bankInfo.iban = 'PK00XXXX00000000000000000000000000000'; // 37 chars
    const resultMaxIban = createEmployeeSchema.safeParse(payload);
    expect(resultMaxIban.success).toBe(false);

    // Test invalid account number (more than 30 characters)
    payload.bankInfo.iban = 'PK00XXXX0000000000000000'; // reset to valid
    payload.bankInfo.account_number = '1234567890123456789012345678901'; // 31 chars
    const resultMaxAccount = createEmployeeSchema.safeParse(payload);
    expect(resultMaxAccount.success).toBe(false);
  });
});

describe('updateAllowancesSchema', () => {
  it('accepts active and inactive allowance rows', () => {
    const result = updateAllowancesSchema.safeParse({
      allowances: [
        {
          allowance_type_id: '11111111-1111-4111-8111-111111111111',
          amount: 2500,
          is_percentage: false,
          is_active: false,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data.allowances[0].is_active).toBe(false);
  });

  it('defaults allowance rows to active when not provided', () => {
    const result = updateAllowancesSchema.safeParse({
      allowances: [
        {
          allowance_type_id: '11111111-1111-4111-8111-111111111111',
          amount: 2500,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data.allowances[0].is_active).toBe(true);
  });
});
