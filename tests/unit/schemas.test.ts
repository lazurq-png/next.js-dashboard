import { describe, expect, it } from 'vitest';
import { CreateInvoice, UpdateInvoice } from '@/app/lib/schemas';

// The actions pass formData.get(...) straight in, so a missing field arrives as null.
const valid = { customerId: 'c0ffee', amount: '12.50', status: 'paid' };

describe.each([
  ['CreateInvoice', CreateInvoice],
  ['UpdateInvoice', UpdateInvoice],
])('%s', (_name, schema) => {
  it('accepts a valid invoice and coerces the amount to a number', () => {
    const result = schema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ customerId: 'c0ffee', amount: 12.5, status: 'paid' });
  });

  it.each(['0', '-5', null])('rejects amount %s', (amount) => {
    const result = schema.safeParse({ ...valid, amount });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.amount).toEqual([
      'Please enter an amount greater than $0',
    ]);
  });

  it('rejects an amount that is not a number', () => {
    const result = schema.safeParse({ ...valid, amount: 'lots' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.amount).toBeDefined();
  });

  it('asks for a customer when none is chosen', () => {
    const result = schema.safeParse({ ...valid, customerId: null });
    expect(result.error?.flatten().fieldErrors.customerId).toEqual(['Please select a customer.']);
  });

  it('asks for a status when none is chosen', () => {
    const result = schema.safeParse({ ...valid, status: null });
    expect(result.error?.flatten().fieldErrors.status).toEqual([
      'Please select an invoice status.',
    ]);
  });

  it('rejects a status other than pending or paid', () => {
    expect(schema.safeParse({ ...valid, status: 'overdue' }).success).toBe(false);
  });

  it('ignores an id or date sent by the client', () => {
    const result = schema.safeParse({ ...valid, id: 'x', date: '2020-01-01' });
    expect(result.data).not.toHaveProperty('id');
    expect(result.data).not.toHaveProperty('date');
  });
});
