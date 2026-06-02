import { describe, expect, it } from 'vitest';
import { createEmployeeSchema } from './employees.schema.js';

function validPayload() {
  return {
    employee_id: 'EMP764',
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

  it('validates employee contact phone and Pakistan address fields', () => {
    const payload = validPayload();
    payload.employeeContact = {
      primary_phone: '123',
      same_as_permanent: false,
      permanent_address: {
        country: 'Pakistan',
        province: 'Atlantis',
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
          path: ['employeeContact', 'permanent_address', 'province'],
        }),
        expect.objectContaining({
          path: ['employeeContact', 'permanent_address', 'city'],
        }),
      ])
    );
  });
});
