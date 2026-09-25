import { z } from 'zod';

// Kept out of actions.ts: a 'use server' module may only export async functions,
// and importing it opens a database connection. Tests import these directly.
export const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

export const CreateInvoice = FormSchema.omit({ id: true, date: true });

export const UpdateInvoice = FormSchema.omit({ id: true, date: true });
