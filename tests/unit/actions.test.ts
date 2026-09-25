import { beforeEach, describe, expect, it, vi } from 'vitest';

// Nothing here reaches a database or a real session: `postgres`, `@/auth` and the
// Next.js runtime helpers the actions call are all replaced with fakes.
const { sql, auth, revalidatePath, redirect } = vi.hoisted(() => ({
  sql: vi.fn(),
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('postgres', () => ({ default: () => sql }));
vi.mock('@/auth', () => ({ auth, signIn: vi.fn() }));
vi.mock('next-auth', () => ({ AuthError: class AuthError extends Error {} }));
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('next/navigation', () => ({ redirect }));

const { createInvoice, updateInvoice, deleteInvoice } = await import('@/app/lib/actions');

function invoiceForm(fields: Record<string, string> = {}) {
  const form = new FormData();
  const values = { customerId: 'c0ffee', amount: '12.50', status: 'paid', ...fields };
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

const signedIn = { user: { id: 'u1', name: 'User', email: 'user@example.com' } };

beforeEach(() => {
  vi.clearAllMocks();
  sql.mockResolvedValue([]);
});

describe('without a session', () => {
  beforeEach(() => auth.mockResolvedValue(null));

  it('createInvoice refuses and writes nothing', async () => {
    const result = await createInvoice({}, invoiceForm());
    expect(result).toEqual({ message: 'You must be logged in to create an invoice.' });
    expect(sql).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('createInvoice refuses before validating, so it reveals nothing about the form', async () => {
    const result = await createInvoice({}, invoiceForm({ amount: '-1' }));
    expect(result).toEqual({ message: 'You must be logged in to create an invoice.' });
  });

  it('updateInvoice refuses and writes nothing', async () => {
    const result = await updateInvoice('i1', {}, invoiceForm());
    expect(result).toEqual({ message: 'You must be logged in to update an invoice.' });
    expect(sql).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('deleteInvoice refuses and writes nothing', async () => {
    await expect(deleteInvoice('i1')).rejects.toThrow('Unauthorized');
    expect(sql).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('treats a session without a user as signed out', async () => {
    auth.mockResolvedValue({ expires: '2099-01-01' });
    await expect(deleteInvoice('i1')).rejects.toThrow('Unauthorized');
    expect(sql).not.toHaveBeenCalled();
  });
});

describe('with a session', () => {
  beforeEach(() => auth.mockResolvedValue(signedIn));

  it('createInvoice stores the amount in cents and redirects to the list', async () => {
    await createInvoice({}, invoiceForm());
    expect(sql).toHaveBeenCalledTimes(1);
    expect(sql.mock.calls[0].slice(1)).toEqual(['c0ffee', 1250, 'paid', expect.any(String)]);
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices');
    expect(redirect).toHaveBeenCalledWith('/dashboard/invoices');
  });

  it('createInvoice still validates the form', async () => {
    const result = await createInvoice({}, invoiceForm({ amount: '0' }));
    expect(result.errors?.amount).toEqual(['Please enter an amount greater than $0']);
    expect(sql).not.toHaveBeenCalled();
  });

  it('updateInvoice writes and redirects', async () => {
    await updateInvoice('i1', {}, invoiceForm({ status: 'pending' }));
    expect(sql).toHaveBeenCalledTimes(1);
    expect(sql.mock.calls[0].slice(1)).toEqual(['c0ffee', 1250, 'pending', 'i1']);
    expect(redirect).toHaveBeenCalledWith('/dashboard/invoices');
  });

  it('deleteInvoice deletes and revalidates the list', async () => {
    await deleteInvoice('i1');
    expect(sql.mock.calls[0].slice(1)).toEqual(['i1']);
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices');
  });

  it('deleteInvoice hides the database error from the client', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    sql.mockRejectedValue(new Error('connection to db.internal:5432 refused'));
    const failure = deleteInvoice('i1');
    await expect(failure).rejects.toThrow('Database Error: Failed to Delete Invoice.');
    await expect(failure).rejects.not.toThrow(/db\.internal/);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
