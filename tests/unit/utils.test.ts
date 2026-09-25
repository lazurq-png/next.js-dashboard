import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDateToLocal,
  generatePagination,
  generateYAxis,
} from '@/app/lib/utils';

describe('formatCurrency', () => {
  it('formats cents as US dollars', () => {
    expect(formatCurrency(12345)).toBe('$123.45');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(100000)).toBe('$1,000.00');
  });
});

describe('formatDateToLocal', () => {
  it('formats an ISO date in en-US by default', () => {
    expect(formatDateToLocal('2023-06-05')).toBe('Jun 5, 2023');
  });

  it('accepts another locale', () => {
    expect(formatDateToLocal('2023-06-05', 'en-GB')).toBe('5 Jun 2023');
  });
});

describe('generateYAxis', () => {
  it('rounds the top label up to the next thousand and counts down to zero', () => {
    const { yAxisLabels, topLabel } = generateYAxis([
      { month: 'Jan', revenue: 2000 },
      { month: 'Feb', revenue: 4800 },
      { month: 'Mar', revenue: 1200 },
    ]);
    expect(topLabel).toBe(5000);
    expect(yAxisLabels).toEqual(['$5K', '$4K', '$3K', '$2K', '$1K', '$0K']);
  });

  it('keeps an exact thousand as the top label', () => {
    expect(generateYAxis([{ month: 'Jan', revenue: 3000 }]).topLabel).toBe(3000);
  });
});

describe('generatePagination', () => {
  it('lists every page when there are 7 or fewer', () => {
    expect(generatePagination(1, 0)).toEqual([]);
    expect(generatePagination(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(generatePagination(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('near the start shows the first three and the last two', () => {
    expect(generatePagination(1, 10)).toEqual([1, 2, 3, '...', 9, 10]);
    expect(generatePagination(3, 10)).toEqual([1, 2, 3, '...', 9, 10]);
  });

  it('near the end shows the first two and the last three', () => {
    expect(generatePagination(8, 10)).toEqual([1, 2, '...', 8, 9, 10]);
    expect(generatePagination(10, 10)).toEqual([1, 2, '...', 8, 9, 10]);
  });

  it('in the middle shows the current page with its neighbours', () => {
    expect(generatePagination(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10]);
  });
});
